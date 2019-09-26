/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import config from './config';

export default {
  ...config,
  testMatch: ['**/*.contract.test.{js,ts,tsx}'],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test_utils/jest/contract_tests/global_setup.ts',
  globalTeardown: '<rootDir>/test_utils/jest/contract_tests/global_teardown.ts',
  forceExit: true,
  reporters: [
    'default',
    ['<rootDir>/../src/dev/jest/junit_reporter.js', { reportName: 'Jest Contracts Tests' }],
  ],
  setupFiles: [
    '<rootDir>/../src/dev/jest/setup/babel_polyfill.js',
    '<rootDir>/../src/dev/jest/setup/enzyme.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/../src/dev/jest/setup/after_env.integration.js'],
};
