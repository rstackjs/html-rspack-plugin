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
  plugins: [
    new HtmlWebpackPlugin({
      // If you pass a plain object, it will be merged with the default values
      // (New in version 4)
      templateParameters: {
        foo: 'bar',
      },
      // Or if you want full control, pass a function
      // templateParameters: (compilation, assets, assetTags, options) => {
      //   return {
      //     compilation,
      //     webpackConfig: compilation.options,
      //     htmlWebpackPlugin: {
      //       tags: assetTags,
      //       files: assets,
      //       options
      //     },
      //     'foo': 'bar'
      //   };
      // },
      template: 'index.ejs',
    }),
  ],
};
