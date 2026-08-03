/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/entity_store'],
  // setupFilesAfterEnv is a list of scripts that are executed after JSDOM is initialized.
  setupFilesAfterEnv: [],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/entity_store',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/entity_store/{common,public,server}/**/*.{ts,tsx}',
  ],
};
