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
      { test: /\.pug$/, loader: 'pug-loader' },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new HtmlRspackPlugin({
      inject: false,
      cache: false,
      template: 'template.pug',
      filename: 'index.html',
      favicon: 'favicon.ico',
      title: 'pug demo',
    }),
  ],
};
