// Configuration guide: https://rstack.rs/config
import path from 'node:path';
import { define } from 'rstack';

const pluginPath = path.resolve(import.meta.dirname, 'lib/index.js');

define.test({
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

define.fmt({
  singleQuote: true,
  proseWrap: 'never',
});

define.staged({
  '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}': ['rs lint', 'rs fmt'],
  '*.{json,md,mdx,css,scss,less,html,yml,yaml}': 'rs fmt',
});

define.lint(({ js, ts }) => [
  js.configs.recommended,
  ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['examples/**/*', 'spec/**/*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['lib/**/*.js'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
    },
  },
]);
