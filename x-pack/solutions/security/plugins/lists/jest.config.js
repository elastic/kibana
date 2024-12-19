/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/lists/{common,public,server}/**/*.{ts,tsx}',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/lists',
  coverageReporters: ['text', 'html'],
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/lists'],
};
