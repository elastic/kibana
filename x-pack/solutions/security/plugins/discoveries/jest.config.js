/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/discoveries'],
  preset: '@kbn/test',
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/discoveries',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/discoveries/server/routes/post/validate/**/*.{ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/discoveries/server/skills/**/*.{ts,tsx}',
    '<rootDir>/x-pack/solutions/security/plugins/discoveries/server/workflows/steps/default_validation_step.ts',
    '<rootDir>/x-pack/solutions/security/plugins/discoveries/server/lib/attack_discovery_*.ts',
  ],
};
