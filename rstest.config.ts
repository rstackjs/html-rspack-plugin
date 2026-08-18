import path from 'node:path';
import process from 'node:process';
import { defineConfig } from '@rstest/core';

const pluginPath = path.resolve(process.cwd(), 'lib/index.js');

export default defineConfig({
  include: ['tests/**/*.test.js'],
  testEnvironment: 'node',
  testTimeout: 30_000,
  restoreMocks: true,
  output: {
    externals: {
      '../../lib/index.js': `commonjs ${pluginPath}`,
    },
  },
  pool: {
    maxWorkers: 1,
  },
});
