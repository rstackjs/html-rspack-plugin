var path = require('path');
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
      { test: /\.pug$/, loader: 'pug-loader' },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      favicon: 'favicon.ico',
      template: 'template.pug',
      title: 'pug demo',
    }),
  ],
};
