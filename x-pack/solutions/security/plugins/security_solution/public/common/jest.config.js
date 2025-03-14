/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const rootConfig = require('@kbn/test/jest-preset');

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/security_solution/public/common',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/common/**/*.{ts,tsx}',
  ],
  moduleNameMapper: require('../../server/__mocks__/module_name_map'),
  transform: {
    ...rootConfig.transform,
    '^.+\\.(js|tsx?)$':
      '<rootDir>/x-pack/solutions/security/plugins/security_solution/jest/babel-transformer.js',
  },
};
