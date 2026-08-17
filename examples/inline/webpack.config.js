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
      { test: /\.pug$/, loader: 'pug-loader' },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      cache: false,
      template: 'template.pug',
      filename: 'index.html',
      favicon: 'favicon.ico',
      title: 'pug demo',
    }),
  ],
};
