var path = require('path');
var HtmlWebpackPlugin = require('../..');
var rspackMajorVersion = require('@rspack/core').rspackVersion.split('.')[0];
module.exports = {
  context: __dirname,
  entry: {
    b: './b.js',
    d: './d.js',
    a: './a.js',
    c: './c.js',
    e: './e.js',
  },
  output: {
    path: path.join(__dirname, 'dist/rspack-' + rspackMajorVersion),
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
    new HtmlWebpackPlugin({
      inject: true,
      filename: 'first-file.html',
      template: 'template.html',
      chunksSortMode: 'manual',
      chunks: ['a', 'b', 'c'],
    }),
    new HtmlWebpackPlugin({
      inject: true,
      filename: 'second-file.html',
      template: 'template.html',
      chunksSortMode: 'manual',
      chunks: ['a', 'b', 'd'],
    }),
  ],
};
