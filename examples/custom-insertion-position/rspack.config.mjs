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
      template: 'index.ejs',
      inject: false,
      // The following settings are optional and only used for
      // demo purposes:
      meta: {
        charset: { charset: 'utf-8' },
        viewport: 'width=device-width, initial-scale=1',
      },
      minify: false,
    }),
  ],
};
