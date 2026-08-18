import { getExamplePaths, HtmlRspackPlugin } from '../config.mjs';

const { context, outputPath } = getExamplePaths(import.meta.url);

export default {
  context,
  entry: {
    b: './b.js',
    d: './d.js',
    a: './a.js',
    c: './c.js',
    e: './e.js',
  },
  output: {
    path: outputPath,
    publicPath: '',
    filename: '[name].js',
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
      inject: true,
      filename: 'first-file.html',
      template: 'template.html',
      chunksSortMode: 'manual',
      chunks: ['a', 'b', 'c'],
    }),
    new HtmlRspackPlugin({
      inject: true,
      filename: 'second-file.html',
      template: 'template.html',
      chunksSortMode: 'manual',
      chunks: ['a', 'b', 'd'],
    }),
  ],
};
