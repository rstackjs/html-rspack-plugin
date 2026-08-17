// @ts-check
/**
 * @file
 * Helper plugin manages the cached state of the child compilation
 *
 * To optimize performance the child compilation is running asyncronously.
 * Therefore it needs to be started in the compiler.make phase and ends after
 * the compilation.afterCompile phase.
 *
 * To prevent bugs from blocked hooks there is no promise or event based api
 * for this plugin.
 *
 * Example usage:
 *
 * ```js
    const childCompilerPlugin = new PersistentChildCompilerPlugin();
    childCompilerPlugin.addEntry('./src/index.js');
    compiler.hooks.afterCompile.tapAsync('MyPlugin', (compilation, callback) => {
      console.log(childCompilerPlugin.getCompilationResult()['./src/index.js']));
      return true;
    });
 * ```
 */
'use strict';

// Import types
/** @typedef {import("@rspack/core").Compiler} Compiler */
/** @typedef {import("@rspack/core").Compilation} Compilation */
/** @typedef {Record<string, number | null>} Snapshot */
/** @typedef {import("./child-compiler").ChildCompilationTemplateResult} ChildCompilationTemplateResult */
/** @typedef {{fileDependencies: string[], contextDependencies: string[], missingDependencies: string[]}} FileDependencies */
/** @typedef {{
  dependencies: FileDependencies,
  compiledEntries: {[entryName: string]: ChildCompilationTemplateResult}
} | {
  dependencies: FileDependencies,
  error: Error
}} ChildCompilationResult */

const { HtmlWebpackChildCompiler } = require('./child-compiler');

/**
 * This plugin is a singleton for performance reasons.
 * To keep track if a plugin does already exist for the compiler they are cached
 * in this map
 * @type {WeakMap<Compiler, PersistentChildCompilerSingletonPlugin>}}
 */
const compilerMap = new WeakMap();

class CachedChildCompilation {
  /**
   * @param {Compiler} compiler
   */
  constructor(compiler) {
    /**
     * @private
     * @type {Compiler}
     */
    this.compiler = compiler;
    // Create a singleton instance for the compiler
    // if there is none
    if (compilerMap.has(compiler)) {
      return;
    }
    const persistentChildCompilerSingletonPlugin = new PersistentChildCompilerSingletonPlugin();
    compilerMap.set(compiler, persistentChildCompilerSingletonPlugin);
    persistentChildCompilerSingletonPlugin.apply(compiler);
  }

  /**
   * apply is called by the webpack main compiler during the start phase
   * @param {string} entry
   */
  addEntry(entry) {
    const persistentChildCompilerSingletonPlugin = compilerMap.get(this.compiler);
    if (!persistentChildCompilerSingletonPlugin) {
      throw new Error(
        'PersistentChildCompilerSingletonPlugin instance not found.'
      );
    }
    persistentChildCompilerSingletonPlugin.addEntry(entry);
  }

  getCompilationResult() {
    const persistentChildCompilerSingletonPlugin = compilerMap.get(this.compiler);
    if (!persistentChildCompilerSingletonPlugin) {
      throw new Error(
        'PersistentChildCompilerSingletonPlugin instance not found.'
      );
    }
    return persistentChildCompilerSingletonPlugin.getLatestResult();
  }

  /**
   * Returns the result for the given entry
   * @param {string} entry
   * @returns {
      | { mainCompilationHash: string, error: Error }
      | { mainCompilationHash: string, compiledEntry: ChildCompilationTemplateResult }
    }
   */
  getCompilationEntryResult(entry) {
    const latestResult = this.getCompilationResult();
    const compilationResult = latestResult.compilationResult;
    return 'error' in compilationResult ? {
      mainCompilationHash: latestResult.mainCompilationHash,
      error: compilationResult.error
    } : {
      mainCompilationHash: latestResult.mainCompilationHash,
      compiledEntry: compilationResult.compiledEntries[entry]
    };
  }
}

class PersistentChildCompilerSingletonPlugin {
  /**
   *
   * @param {string[]} fileDependencies
   * @param {Compilation} mainCompilation
   */
  static createSnapshot(fileDependencies, mainCompilation) {
    /** @type {Snapshot} */
    const timestamps = {};
    const fs = /** @type {NonNullable<Compilation['inputFileSystem']>} */ (
      mainCompilation.inputFileSystem
    );

    return Promise.all(
      fileDependencies.map(file => {
        return new Promise(resolve => {
          fs.stat(file, (err, stat) => {
            if (!err && stat) {
              timestamps[file] = stat.mtime.getTime();
            } else {
              timestamps[file] = null;
            }
            resolve(undefined);
          });
        });
      })
    ).then(() => timestamps);
  }

  /**
   * Returns true if the files inside this snapshot
   * have not been changed
   *
   * @param {Snapshot} snapshot
   * @param {Compilation} mainCompilation
   * @returns {Promise<boolean | undefined>}
   */
  static isSnapshotValid(snapshot, mainCompilation) {
    const fs = /** @type {NonNullable<Compilation['inputFileSystem']>} */ (
      mainCompilation.inputFileSystem
    );

    return Promise.all(
      Object.keys(snapshot).map(file => {
        return new Promise(resolve => {
          fs.stat(file, (err, stat) => {
            if (!err && stat && snapshot[file] !== null) {
              // File exists and check if the timestamp is the same
              resolve(stat.mtime.getTime() === snapshot[file]);
            } else if (err && snapshot[file] === null) {
              // File does not exist and was not existing before
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });
      })
    ).then(results => !results.includes(false));
  }

  static watchFiles(mainCompilation, fileDependencies) {
    Object.keys(fileDependencies).forEach((depencyTypes) => {
      fileDependencies[depencyTypes].forEach(fileDependency => {
        mainCompilation[depencyTypes].add(fileDependency);
      });
    });
  }

  constructor() {
    /**
     * @private
     * @type {
      | {
        isCompiling: false,
        isVerifyingCache: false,
        entries: string[],
        compiledEntries: string[],
        mainCompilationHash: string,
        compilationResult: ChildCompilationResult
      }
    | Readonly<{
      isCompiling: false,
      isVerifyingCache: true,
      entries: string[],
      previousEntries: string[],
      previousResult: ChildCompilationResult
    }>
    | Readonly <{
      isVerifyingCache: false,
      isCompiling: true,
      entries: string[],
    }>
  } the internal compilation state */
    this.compilationState = {
      isCompiling: false,
      isVerifyingCache: false,
      entries: [],
      compiledEntries: [],
      mainCompilationHash: 'initial',
      compilationResult: {
        dependencies: {
          fileDependencies: [],
          contextDependencies: [],
          missingDependencies: []
        },
        compiledEntries: {}
      }
    };
  }

  /**
   * apply is called by the webpack main compiler during the start phase
   * @param {Compiler} compiler
   */
  apply(compiler) {
    /** @type Promise<ChildCompilationResult> */
    let childCompilationResultPromise = Promise.resolve({
      dependencies: {
        fileDependencies: [],
        contextDependencies: [],
        missingDependencies: []
      },
      compiledEntries: {}
    });
    /**
     * The main compilation hash which will only be updated
     * if the childCompiler changes
     */
    /** @type {string} */
    let mainCompilationHashOfLastChildRecompile = '';
    /** @type {Snapshot | undefined} */
    let previousFileSystemSnapshot;
    compiler.hooks.make.tapAsync(
      'PersistentChildCompilerSingletonPlugin',
      (mainCompilation, callback) => {
        if (this.compilationState.isCompiling || this.compilationState.isVerifyingCache) {
          return callback(new Error('Child compilation has already started'));
        }

        // The compilation starts - adding new templates is now not possible anymore
        this.compilationState = {
          isCompiling: false,
          isVerifyingCache: true,
          previousEntries: this.compilationState.compiledEntries,
          previousResult: this.compilationState.compilationResult,
          entries: this.compilationState.entries
        };

        // Validate cache:
        const isCacheValidPromise = this.isCacheValid(previousFileSystemSnapshot, mainCompilation);

        let cachedResult = childCompilationResultPromise;
        childCompilationResultPromise = isCacheValidPromise.then((isCacheValid) => {
          // Reuse cache
          if (isCacheValid) {
            return cachedResult;
          }
          // Start the compilation
          const compiledEntriesPromise = this.compileEntries(
            mainCompilation,
            this.compilationState.entries
          );
          // Update snapshot as soon as we know the filedependencies
          // this might possibly cause bugs if files were changed inbetween
          // compilation start and snapshot creation
          compiledEntriesPromise.then((childCompilationResult) => {
            return PersistentChildCompilerSingletonPlugin.createSnapshot(childCompilationResult.dependencies.fileDependencies, mainCompilation);
          }).then((snapshot) => {
            previousFileSystemSnapshot = snapshot;
          });
          return compiledEntriesPromise;
        });

        // Add files to compilation which needs to be watched:
        mainCompilation.hooks.optimizeTree.tapAsync(
          'PersistentChildCompilerSingletonPlugin',
          (chunks, modules, callback) => {
            const handleCompilationDonePromise = childCompilationResultPromise.then(
              childCompilationResult => {
                this.watchFiles(
                  mainCompilation,
                  childCompilationResult.dependencies
                );
              });
            // @ts-ignore
            handleCompilationDonePromise.then(() => callback(null, chunks, modules), callback);
          }
        );

        // Store the final compilation once the main compilation hash is known
        mainCompilation.hooks.additionalAssets.tapAsync(
          'PersistentChildCompilerSingletonPlugin',
          (callback) => {
            const didRecompilePromise = Promise.all([childCompilationResultPromise, cachedResult]).then(
              ([childCompilationResult, cachedResult]) => {
                // Update if childCompilation changed
                return (cachedResult !== childCompilationResult);
              }
            );

            const handleCompilationDonePromise = Promise.all([childCompilationResultPromise, didRecompilePromise]).then(
              ([childCompilationResult, didRecompile]) => {
                // Update hash and snapshot if childCompilation changed
                if (didRecompile) {
                  mainCompilationHashOfLastChildRecompile = /** @type {string} */ (mainCompilation.hash);
                }
                this.compilationState = {
                  isCompiling: false,
                  isVerifyingCache: false,
                  entries: this.compilationState.entries,
                  compiledEntries: this.compilationState.entries,
                  compilationResult: childCompilationResult,
                  mainCompilationHash: mainCompilationHashOfLastChildRecompile
                };
              });
            handleCompilationDonePromise.then(() => callback(null), callback);
          }
        );

        // Continue compilation:
        callback(null);
      }
    );
  }

  /**
   * Add a new entry to the next compile run
   * @param {string} entry
   */
  addEntry(entry) {
    if (this.compilationState.isCompiling || this.compilationState.isVerifyingCache) {
      throw new Error(
        'The child compiler has already started to compile. ' +
        "Please add entries before the main compiler 'make' phase has started or " +
        'after the compilation is done.'
      );
    }
    if (this.compilationState.entries.indexOf(entry) === -1) {
      this.compilationState.entries = [...this.compilationState.entries, entry];
    }
  }

  getLatestResult() {
    if (this.compilationState.isCompiling || this.compilationState.isVerifyingCache) {
      throw new Error(
        'The child compiler is not done compiling. ' +
        "Please access the result after the compiler 'make' phase has started or " +
        'after the compilation is done.'
      );
    }
    return {
      mainCompilationHash: this.compilationState.mainCompilationHash,
      compilationResult: this.compilationState.compilationResult
    };
  }

  /**
   * Verify that the cache is still valid
   * @private
   * @param {Snapshot | undefined} snapshot
   * @param {Compilation} mainCompilation
   * @returns {Promise<boolean | undefined>}
   */
  isCacheValid(snapshot, mainCompilation) {
    if (!this.compilationState.isVerifyingCache) {
      return Promise.reject(new Error('Cache validation can only be done right before the compilation starts'));
    }
    // If there are no entries we don't need a new child compilation
    if (this.compilationState.entries.length === 0) {
      return Promise.resolve(true);
    }
    // If there are new entries the cache is invalid
    if (this.compilationState.entries !== this.compilationState.previousEntries) {
      return Promise.resolve(false);
    }
    // Mark the cache as invalid if there is no snapshot
    if (!snapshot) {
      return Promise.resolve(false);
    }

    return PersistentChildCompilerSingletonPlugin.isSnapshotValid(snapshot, mainCompilation);
  }

  /**
   * Start to compile all templates
   *
   * @private
   * @param {Compilation} mainCompilation
   * @param {string[]} entries
   * @returns {Promise<ChildCompilationResult>}
   */
  compileEntries(mainCompilation, entries) {
    const compiler = new HtmlWebpackChildCompiler(entries);
    return compiler.compileTemplates(mainCompilation).then((result) => {
      return {
        // The compiled sources to render the content
        compiledEntries: result,
        // The file dependencies to find out if a
        // recompilation is required
        dependencies: compiler.fileDependencies,
        // The main compilation hash can be used to find out
        // if this compilation was done during the current compilation
        mainCompilationHash: mainCompilation.hash
      };
    }, error => ({
      // The compiled sources to render the content
      error,
      // The file dependencies to find out if a
      // recompilation is required
      dependencies: compiler.fileDependencies,
      // The main compilation hash can be used to find out
      // if this compilation was done during the current compilation
      mainCompilationHash: mainCompilation.hash
    }));
  }

  /**
   * @private
   * @param {Compilation} mainCompilation
   * @param {FileDependencies} files
   */
  watchFiles(mainCompilation, files) {
    PersistentChildCompilerSingletonPlugin.watchFiles(mainCompilation, files);
  }
}

module.exports = {
  CachedChildCompilation
};
