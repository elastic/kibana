/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2'],
  /** all nested directories have their own Jest config file */
  testMatch: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/*.test.{js,mjs,ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/csp/**/*.test.{js,mjs,ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/ioc/**/*.test.{js,mjs,ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/network/**/*.test.{js,mjs,ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/rule/**/*.test.{js,mjs,ts,tsx}',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/security_solution/public/flyout_v2',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/*.{ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/csp/**/*.{ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/ioc/**/*.{ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/network/**/*.{ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout_v2/rule/**/*.{ts,tsx}',
  ],
  moduleNameMapper: require('../../server/__mocks__/module_name_map'),
  setupFilesAfterEnv: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/flyout/test/setup.ts',
  ],
};
