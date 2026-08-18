import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rspackVersion } from '@rspack/core';
import HtmlRspackPlugin from '../lib/index.js';

const rspackMajorVersion = rspackVersion.split('.')[0];

export { HtmlRspackPlugin };

export function getExamplePaths(metaUrl) {
  const context = fileURLToPath(new URL('.', metaUrl));

  return {
    context,
    outputPath: path.join(context, 'dist', `rspack-${rspackMajorVersion}`),
  };
}
