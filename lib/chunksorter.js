// @ts-check
'use strict';

/** @typedef {import("@rspack/core").Compilation} Compilation */

/**
 * Performs identity mapping (no-sort).
 * @param {string[]} chunks the chunks to sort
 * @returns {string[]} The sorted chunks
 */
function none(chunks) {
  return chunks;
}

/**
 * Sorts chunks in the order configured by the plugin.
 * @param {string[]} entryPointNames the chunks to sort
 * @param {Compilation} compilation the Rspack compilation
 * @param {any} htmlRspackPluginOptions the plugin options
 * @returns {string[]} The sorted chunks
 */
function manual(entryPointNames, compilation, htmlRspackPluginOptions) {
  const chunks = htmlRspackPluginOptions.chunks;
  if (!Array.isArray(chunks)) {
    return entryPointNames;
  }

  return chunks.filter((entryPointName) =>
    compilation.entrypoints.has(entryPointName),
  );
}

module.exports = {
  auto: none,
  manual,
  none,
};
