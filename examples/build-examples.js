/**
 * Build all examples with Rspack.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { rspack, rspackVersion } = require('@rspack/core');

const rspackMajorVersion = rspackVersion.split('.')[0];
const examples = fs
  .readdirSync(__dirname)
  .filter((file) => fs.statSync(path.join(__dirname, file)).isDirectory());

function buildExample(exampleName) {
  const examplePath = path.join(__dirname, exampleName);
  const config = require(path.join(examplePath, 'webpack.config.js'));

  config.mode = 'production';
  config.optimization = config.optimization || {};
  config.optimization.minimizer = [];

  fs.rmSync(path.join(examplePath, 'dist', `rspack-${rspackMajorVersion}`), {
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

Promise.all(examples.map(buildExample)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
