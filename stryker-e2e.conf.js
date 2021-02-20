/* eslint-disable import/no-commonjs */

/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutate: ['src/**/*.ts', '!src/**/__tests__/**', '!src/utils/test-utils.ts'],
  testRunner: 'jest',
  jest: {
    configFile: './jest-e2e.config.js',
    enableFindRelatedTests: false
  },
  coverageAnalysis: 'perTest',
  concurrency: 1,
  reporters: ['progress', 'clear-text']
};
