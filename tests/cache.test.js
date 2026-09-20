import { EventEmitter, on } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { describe, expect, it, rs } from 'rstack/test';
import {
  closeCompiler,
  createCompiler,
  createProject,
  getCompilationResult,
  HtmlRspackPlugin,
  runCompiler,
  writeFiles,
} from './helpers/compile.js';

function expectSuccessfulBuild(stats) {
  const result = getCompilationResult(stats);
  expect(result.info.errors).toEqual([]);
  return result.assets;
}

describe('template cache', () => {
  it('compiles and caches templates without reading the main module collection', async () => {
    const context = createProject({
      'template.ejs': '<html><body>template</body></html>',
    });
    const htmlPlugin = new HtmlRspackPlugin({ template: './template.ejs' });
    const { compiler } = createCompiler({ context, htmlPlugin });
    const moduleGetters = [];
    compiler.hooks.thisCompilation.tap('TrackModuleAccess', (compilation) => {
      moduleGetters.push(rs.spyOn(compilation, 'modules', 'get'));
    });

    try {
      const firstAssets = expectSuccessfulBuild(await runCompiler(compiler));
      expect(firstAssets['index.html']).toContain('template');
      const cachedAssets = expectSuccessfulBuild(await runCompiler(compiler));
      expect(cachedAssets['index.html']).toBe(firstAssets['index.html']);
      expect(moduleGetters).toHaveLength(2);
      for (const getter of moduleGetters) {
        expect(getter).not.toHaveBeenCalled();
      }
    } finally {
      await closeCompiler(compiler);
      fs.rmSync(context, { force: true, recursive: true });
    }
  });

  it('reuses the template until the template file changes', async () => {
    const context = createProject({
      'template.ejs': '<html><body>first</body></html>',
    });
    const htmlPlugin = new HtmlRspackPlugin({ template: './template.ejs' });
    const evaluateTemplate = rs.spyOn(htmlPlugin, 'evaluateCompilationResult');
    const { compiler } = createCompiler({ context, htmlPlugin });

    try {
      const firstAssets = expectSuccessfulBuild(await runCompiler(compiler));
      expect(firstAssets['index.html']).toContain('first');
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      const unchangedAssets = expectSuccessfulBuild(
        await runCompiler(compiler),
      );
      expect(unchangedAssets['index.html']).toContain('first');
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      writeFiles(context, {
        'src/index.js': 'console.log("changed entry");',
      });
      expectSuccessfulBuild(await runCompiler(compiler));
      expect(evaluateTemplate).toHaveBeenCalledTimes(1);

      writeFiles(context, {
        'template.ejs': '<html><body>second</body></html>',
      });
      const changedAssets = expectSuccessfulBuild(await runCompiler(compiler));
      expect(changedAssets['index.html']).toContain('second');
      expect(evaluateTemplate).toHaveBeenCalledTimes(2);
    } finally {
      await closeCompiler(compiler);
      fs.rmSync(context, { force: true, recursive: true });
    }
  });

  it('regenerates HTML when the plugin cache is disabled', async () => {
    const context = createProject({
      'template.ejs': '<html><body>template</body></html>',
    });
    const htmlPlugin = new HtmlRspackPlugin({
      cache: false,
      template: './template.ejs',
    });
    const evaluateTemplate = rs.spyOn(htmlPlugin, 'evaluateCompilationResult');
    const { compiler } = createCompiler({ context, htmlPlugin });

    try {
      expectSuccessfulBuild(await runCompiler(compiler));
      writeFiles(context, {
        'src/index.js': 'console.log("changed entry");',
      });
      expectSuccessfulBuild(await runCompiler(compiler));

      expect(evaluateTemplate).toHaveBeenCalledTimes(2);
    } finally {
      await closeCompiler(compiler);
      fs.rmSync(context, { force: true, recursive: true });
    }
  });

  it('watches async template dependencies shared by multiple HTML plugins', async () => {
    const context = createProject({
      'first.html': 'first',
      'second.html': 'second',
      'partial.txt': 'initial partial',
      'template-loader.cjs': `
        const fs = require('node:fs');
        const path = require('node:path');
        module.exports = function (source) {
          const callback = this.async();
          const partial = path.join(this.context, 'partial.txt');
          this.addDependency(partial);
          setTimeout(() => {
            const html = '<html><body>' + source + ' ' + fs.readFileSync(partial, 'utf8') + '</body></html>';
            callback(null, 'module.exports = ' + JSON.stringify(html));
          }, 20);
        };
      `,
    });
    const firstPlugin = new HtmlRspackPlugin({
      template: `!!${path.join(context, 'template-loader.cjs')}!${path.join(context, 'first.html')}`,
    });
    const secondPlugin = new HtmlRspackPlugin({
      filename: 'second.html',
      template: `!!${path.join(context, 'template-loader.cjs')}!${path.join(context, 'second.html')}`,
    });
    const evaluateFirst = rs.spyOn(firstPlugin, 'evaluateCompilationResult');
    const evaluateSecond = rs.spyOn(secondPlugin, 'evaluateCompilationResult');
    const { compiler } = createCompiler({
      context,
      htmlPlugin: firstPlugin,
      config: { plugins: [secondPlugin] },
    });
    const events = new EventEmitter();
    const controller = new AbortController();
    const builds = on(events, 'build', { signal: controller.signal });
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const nextBuild = async () => {
      const {
        value: [error, stats],
      } = await builds.next();
      if (error) throw error;
      // Watchpack starts watching on the next tick after the build callback.
      await setImmediate();
      return expectSuccessfulBuild(stats);
    };

    try {
      compiler.watch({ aggregateTimeout: 20, poll: 20 }, (error, stats) => {
        events.emit('build', error, stats);
      });
      const firstAssets = await nextBuild();
      expect(firstAssets['index.html']).toContain('first initial partial');
      expect(firstAssets['second.html']).toContain('second initial partial');

      writeFiles(context, { 'src/index.js': 'console.log("changed entry");' });
      await nextBuild();
      expect(evaluateFirst).toHaveBeenCalledTimes(1);
      expect(evaluateSecond).toHaveBeenCalledTimes(1);

      writeFiles(context, { 'partial.txt': 'updated partial' });
      const dependencyAssets = await nextBuild();
      expect(dependencyAssets['index.html']).toContain('first updated partial');
      expect(dependencyAssets['second.html']).toContain(
        'second updated partial',
      );

      writeFiles(context, { 'first.html': 'updated template' });
      const templateAssets = await nextBuild();
      expect(templateAssets['index.html']).toContain(
        'updated template updated partial',
      );
      expect(templateAssets['second.html']).toContain('second updated partial');
    } finally {
      clearTimeout(timeout);
      controller.abort();
      await closeCompiler(compiler);
      fs.rmSync(context, { force: true, recursive: true });
    }
  });
});
