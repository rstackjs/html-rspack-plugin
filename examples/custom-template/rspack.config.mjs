import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getExamplePaths, HtmlRspackPlugin } from '../config.mjs';

const { context, outputPath } = getExamplePaths(import.meta.url);

export default {
  context,
  entry: './example.js',
  output: {
    path: outputPath,
    publicPath: '',
    filename: 'bundle.js',
  },
  module: {
    rules: [
      { test: /\.css$/, type: 'css' },
      { test: /\.png$/, type: 'asset/resource' },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new HtmlRspackPlugin({
      template: 'template.html',
      templateParameters: {
        partial: readFileSync(path.join(context, 'partial.html'), 'utf8'),
      },
    }),
  ],
};
