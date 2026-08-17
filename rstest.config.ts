import { defineConfig } from '@rstest/core';

export default defineConfig({
  include: ['tests/**/*.test.js'],
  testEnvironment: 'node',
  testTimeout: 30_000,
  restoreMocks: true,
  pool: {
    maxWorkers: 1,
  },
});
