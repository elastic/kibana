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
    '<rootDir>/x-pack/solutions/security/plugins/alert_zero/public',
    '<rootDir>/x-pack/solutions/security/plugins/alert_zero/server',
    '<rootDir>/x-pack/solutions/security/plugins/alert_zero/common',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/alert_zero/{public,server,common}/**/*.{js,ts,tsx}',
  ],
  coverageReporters: ['html'],
};
