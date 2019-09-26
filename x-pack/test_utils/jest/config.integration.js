/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RESERVED_DIR_JEST_INTEGRATION_TESTS } from '../../../src/dev/constants';
import config from './config';

export default {
  ...config,
  testMatch: [
    `**/${RESERVED_DIR_JEST_INTEGRATION_TESTS}/**/*.test.{js,ts,tsx}`,
    // Tests within `__jest__` directories should be treated as regular unit tests.
    `!**/__jest__/${RESERVED_DIR_JEST_INTEGRATION_TESTS}/**/*.test.{js,ts,tsx}`,
  ],
  testPathIgnorePatterns: config.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes(RESERVED_DIR_JEST_INTEGRATION_TESTS)
  ),
  reporters: [
    'default',
    ['<rootDir>/../src/dev/jest/junit_reporter.js', { reportName: 'Jest Integration Tests' }],
  ],
  setupFilesAfterEnv: [
    '<rootDir>/../src/dev/jest/setup/after_env.integration.js'
  ]
};
