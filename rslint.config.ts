import { defineConfig, js, ts } from '@rslint/core';

export default defineConfig([
  js.configs.recommended,
  ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['lib/cached-child-compiler.js'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['examples/**/*', 'spec/**/*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['lib/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        global: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
    },
  },
]);
