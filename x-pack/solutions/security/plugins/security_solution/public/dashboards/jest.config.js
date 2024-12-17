/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
<<<<<<<< HEAD:x-pack/packages/kbn-ai-assistant-common/jest.config.js
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/packages/kbn_ai_assistant_common_src',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/packages/kbn-ai-assistant-common/src/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/packages/kbn-ai-assistant-common/src/*.test.{ts,tsx}',
========
  preset: '@kbn/test',
  rootDir: '../../../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/security_solution/public/dashboards'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/security_solution/public/dashboards',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/dashboards/**/*.{ts,tsx}',
>>>>>>>> da25d13a2ac (Sustainable Kibana Architecture: Move modules owned by `@elastic/security-solution` (#202851)):x-pack/solutions/security/plugins/security_solution/public/dashboards/jest.config.js
  ],
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/packages/kbn-ai-assistant-common'],
};
