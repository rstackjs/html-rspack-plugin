import { getExamplePaths, HtmlRspackPlugin } from '../config.mjs';

const { context, outputPath } = getExamplePaths(import.meta.url);

export default {
  context,
  entry: {
    entryA: './entryA.js',
    entryB: './entryB.js',
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
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      maxAsyncRequests: 9,
      maxInitialRequests: 9,
      name: false,
      cacheGroups: {
        libMath: {
          test: /lib-(multiply|sum)/,
          name: 'libMath',
          chunks: 'all',
        },
        libText: {
          test: /lib-concat/,
          name: 'libText',
          chunks: 'all',
        },
      },
    },
  },
  plugins: [
    new HtmlRspackPlugin({
      filename: 'entryA.html',
      chunks: ['entryA'],
    }),
    new HtmlRspackPlugin({
      filename: 'entryB.html',
      chunks: ['entryB'],
    }),
    new HtmlRspackPlugin({
      filename: 'entryC.html',
    }),
  ],
};
