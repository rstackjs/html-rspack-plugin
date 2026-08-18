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
      { test: /partial\.html$/, type: 'asset/source' },
    ],
  },
  experiments: {
    css: true,
  },
  devtool: 'eval',
  plugins: [
    new HtmlRspackPlugin({
      template: 'template.js',
    }),
  ],
};
