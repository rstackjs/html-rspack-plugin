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
  plugins: [
    new HtmlRspackPlugin({
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
