// @ts-check
'use strict';
/**
 * This file provides access to all public htmlWebpackPlugin hooks
 */

/** @typedef {import("@rspack/core").Compilation} RspackCompilation */
/** @typedef {import("./index.js")} HtmlRspackPlugin */
/** @typedef {import("../typings").Hooks} HtmlRspackPluginHooks */

const { AsyncSeriesWaterfallHook } = require('@rspack/lite-tapable');

// The following is the API definition for all available hooks
// For the TypeScript definition, see the Hooks type in typings.d.ts
/**
  beforeAssetTagGeneration:
    AsyncSeriesWaterfallHook<{
      assets: {
        publicPath: string,
        js: Array<string>,
        css: Array<string>,
        favicon?: string | undefined
      },
      outputName: string,
      plugin: HtmlRspackPlugin
    }>,
  alterAssetTags:
    AsyncSeriesWaterfallHook<{
      assetTags: {
        scripts: Array<HtmlTagObject>,
        styles: Array<HtmlTagObject>,
        meta: Array<HtmlTagObject>,
      },
      publicPath: string,
      outputName: string,
      plugin: HtmlRspackPlugin
    }>,
  alterAssetTagGroups:
    AsyncSeriesWaterfallHook<{
      headTags: Array<HtmlTagObject | HtmlTagObject>,
      bodyTags: Array<HtmlTagObject | HtmlTagObject>,
      publicPath: string,
      outputName: string,
      plugin: HtmlRspackPlugin
    }>,
  afterTemplateExecution:
    AsyncSeriesWaterfallHook<{
      html: string,
      headTags: Array<HtmlTagObject | HtmlTagObject>,
      bodyTags: Array<HtmlTagObject | HtmlTagObject>,
      outputName: string,
      plugin: HtmlRspackPlugin,
    }>,
  beforeEmit:
    AsyncSeriesWaterfallHook<{
      html: string,
      outputName: string,
      plugin: HtmlRspackPlugin,
    }>,
  afterEmit:
    AsyncSeriesWaterfallHook<{
      outputName: string,
      plugin: HtmlRspackPlugin
    }>
*/

/**
 * @type {WeakMap<RspackCompilation, HtmlRspackPluginHooks>}}
 */
const htmlWebpackPluginHooksMap = new WeakMap();

/**
 * Returns all public hooks of the html webpack plugin for the given compilation
 *
 * @param {RspackCompilation} compilation
 * @returns {HtmlRspackPluginHooks}
 */
function getHtmlRspackPluginHooks(compilation) {
  let hooks = htmlWebpackPluginHooksMap.get(compilation);
  // Setup the hooks only once
  if (hooks === undefined) {
    hooks = createHtmlRspackPluginHooks();
    htmlWebpackPluginHooksMap.set(compilation, hooks);
  }
  return hooks;
}

/**
 * Add hooks to the webpack compilation object to allow foreign plugins to
 * extend the HtmlRspackPlugin
 *
 * @returns {HtmlRspackPluginHooks}
 */
function createHtmlRspackPluginHooks() {
  return {
    beforeAssetTagGeneration: new AsyncSeriesWaterfallHook(['pluginArgs']),
    alterAssetTags: new AsyncSeriesWaterfallHook(['pluginArgs']),
    alterAssetTagGroups: new AsyncSeriesWaterfallHook(['pluginArgs']),
    afterTemplateExecution: new AsyncSeriesWaterfallHook(['pluginArgs']),
    beforeEmit: new AsyncSeriesWaterfallHook(['pluginArgs']),
    afterEmit: new AsyncSeriesWaterfallHook(['pluginArgs']),
  };
}

module.exports = {
  getHtmlRspackPluginHooks,
};
