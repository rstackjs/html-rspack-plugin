var path = require('path');
var HtmlWebpackPlugin = require('../..');
var rspackMajorVersion = require('@rspack/core').rspackVersion.split('.')[0];

module.exports = {
  context: __dirname,
  entry: {
    first: './first.js',
    second: './second.js',
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
      filename: '[name].html',
    }),
  ],
};
