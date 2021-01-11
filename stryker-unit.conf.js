/* eslint-disable import/no-commonjs */

/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutate: ['src/**/*.ts', '!src/**/__tests__/**'],
  testRunner: 'jest',
  jest: {
    configFile: './jest-unit.config.js',
    enableFindRelatedTests: true
  },
  coverageAnalysis: 'perTest',
  concurrency: 1,
  reporters: ['progress', 'clear-text']
};
