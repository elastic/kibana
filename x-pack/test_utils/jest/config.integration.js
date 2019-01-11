/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import config from './config';

export default {
  ...config,
  testMatch: [
    '**/integration_tests/**/*.test.js',
    '**/integration_tests/**/*.test.ts',
  ],
  testPathIgnorePatterns: config.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes('integration_tests')
  ),
  reporters: [
    'default',
    ['<rootDir>/../src/dev/jest/junit_reporter.js', { reportName: 'Jest Integration Tests' }],
  ],
};
