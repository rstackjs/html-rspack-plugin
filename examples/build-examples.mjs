import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rspack, rspackVersion } from '@rspack/core';

const examplesDirectory = fileURLToPath(new URL('.', import.meta.url));
const rspackMajorVersion = rspackVersion.split('.')[0];
const examples = (await readdir(examplesDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

async function buildExample(exampleName) {
  const examplePath = path.join(examplesDirectory, exampleName);
  const configUrl = pathToFileURL(path.join(examplePath, 'rspack.config.mjs'));
  const { default: config } = await import(configUrl.href);

  config.mode = 'production';
  config.optimization = config.optimization || {};
  config.optimization.minimizer = [];

  await rm(path.join(examplePath, 'dist', `rspack-${rspackMajorVersion}`), {
    force: true,
    recursive: true,
  });

  return new Promise((resolve, reject) => {
    rspack(config, (error, stats) => {
      if (error) {
        reject(error);
        return;
      }

      if (!stats || stats.hasErrors()) {
        reject(
          new Error(
            stats
              ? stats.toString({ colors: true })
              : 'Rspack did not return compilation stats.',
          ),
        );
        return;
      }

      resolve();
    });
  });
}

try {
  await Promise.all(examples.map(buildExample));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
