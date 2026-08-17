var path = require('path');
var fs = require('fs');
var HtmlWebpackPlugin = require('../..');
var rspackMajorVersion = require('@rspack/core').rspackVersion.split('.')[0];

module.exports = {
  context: __dirname,
  entry: './example.js',
  output: {
    path: path.join(__dirname, 'dist/rspack-' + rspackMajorVersion),
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
    new HtmlWebpackPlugin({
      template: 'template.html',
      templateParameters: {
        partial: fs.readFileSync(path.join(__dirname, 'partial.html'), 'utf8'),
      },
    }),
  ],
};
