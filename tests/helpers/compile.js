import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { rspack } from '@rspack/core';

const require = createRequire(import.meta.url);
export const HtmlRspackPlugin = require(
  path.resolve(process.cwd(), 'lib/index.js'),
);

export function createProject(files = {}) {
  const context = fs.mkdtempSync(path.join(os.tmpdir(), 'html-rspack-plugin-'));

  writeFiles(context, {
    'src/index.js': 'console.log("app");',
    ...files,
  });

  return context;
}

export function writeFiles(context, files) {
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(context, name);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  }
}

export function createCompiler({
  context,
  config = {},
  htmlPlugin = new HtmlRspackPlugin(),
}) {
  const { output, plugins = [], ...rest } = config;

  const compiler = rspack({
    mode: 'production',
    context,
    devtool: false,
    entry: {
      main: './src/index.js',
    },
    output: {
      path: path.join(context, 'dist'),
      filename: '[name].js',
      publicPath: '',
      ...output,
    },
    optimization: {
      minimize: false,
    },
    ...rest,
    plugins: [htmlPlugin, ...plugins],
  });

  return { compiler, htmlPlugin };
}

export function runCompiler(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
      } else if (!stats) {
        reject(new Error('Rspack did not return compilation stats.'));
      } else {
        resolve(stats);
      }
    });
  });
}

export function closeCompiler(compiler) {
  return new Promise((resolve, reject) => {
    compiler.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export function getCompilationResult(stats) {
  const info = stats.toJson({
    all: false,
    errors: true,
    hash: true,
    warnings: true,
  });
  const assets = {};

  for (const asset of stats.compilation.getAssets()) {
    const content = asset.source.source();
    assets[asset.name] = Buffer.isBuffer(content)
      ? content.toString()
      : String(content);
  }

  return { assets, info, stats };
}

export async function compile({
  files,
  config,
  pluginOptions,
  allowErrors = false,
} = {}) {
  const context = createProject(files);
  const { compiler, htmlPlugin } = createCompiler({
    context,
    config,
    htmlPlugin: new HtmlRspackPlugin(pluginOptions),
  });

  try {
    const result = getCompilationResult(await runCompiler(compiler));

    if (!allowErrors && result.info.errors.length > 0) {
      throw new Error(
        `Rspack compilation failed:\n${JSON.stringify(result.info.errors, null, 2)}`,
      );
    }

    return { ...result, htmlPlugin };
  } finally {
    await closeCompiler(compiler);
    fs.rmSync(context, { force: true, recursive: true });
  }
}
