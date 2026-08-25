/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: [
    '<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components',
  ],
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/*.test',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/types/*',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/*.type',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/*.styles',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/mocks/*',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/*.config',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/translations',
    '!<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/**/types/*',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/x-pack/solutions/security/packages/kbn-securitysolution-exception-list-components/setup_test.ts',
  ],
};
