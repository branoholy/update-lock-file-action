/* eslint-disable import/no-commonjs */

/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutator: 'typescript',
  packageManager: 'npm',
  reporters: ['progress', 'clear-text'],
  maxConcurrentTestRunners: 1,
  testRunner: 'jest',
  jest: {
    enableFindRelatedTests: true
  },
  transpilers: [],
  coverageAnalysis: 'off',
  tsconfigFile: 'tsconfig.json',
  mutate: ['src/**/*.ts', '!src/**/__tests__/**']
};
