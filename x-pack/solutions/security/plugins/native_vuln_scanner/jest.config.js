/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/native_vuln_scanner'],
  preset: '@kbn/jest',
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/native_vuln_scanner',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/native_vuln_scanner/server/**/*.ts',
  ],
};
