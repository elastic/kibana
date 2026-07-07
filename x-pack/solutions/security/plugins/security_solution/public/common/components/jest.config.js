/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common/components'],
  testPathIgnorePatterns: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common/components/ml/',
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common/components/visualization_actions/',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/security_solution/public/common/components',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common/components/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common/components/ml/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common/components/visualization_actions/**/*.{ts,tsx}',
  ],
  moduleNameMapper: require('../../../server/__mocks__/module_name_map'),
};
