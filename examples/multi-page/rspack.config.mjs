import { getExamplePaths, HtmlRspackPlugin } from '../config.mjs';

const { context, outputPath } = getExamplePaths(import.meta.url);

export default {
  context,
  entry: {
    first: './first.js',
    second: './second.js',
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
      filename: '[name].html',
    }),
  ],
};
