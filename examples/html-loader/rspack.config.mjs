import { getExamplePaths, HtmlRspackPlugin } from '../config.mjs';

const { context, outputPath } = getExamplePaths(import.meta.url);

export default {
  context,
  entry: './example.js',
  output: {
    path: outputPath,
    publicPath: '',
    filename: 'bundle.js',
    assetModuleFilename: '[name][ext]',
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
      filename: 'index.html',
      favicon: 'favicon.ico',
      template: 'template.html',
    }),
    new HtmlRspackPlugin({
      filename: 'about.html',
      favicon: 'favicon.ico',
      template: 'template.html',
    }),
  ],
};
