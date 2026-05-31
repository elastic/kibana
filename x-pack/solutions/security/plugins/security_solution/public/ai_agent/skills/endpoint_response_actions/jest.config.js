/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../../..',
  testMatch: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/ai_agent/skills/endpoint_response_actions/__tests__/**/*.test.{js,mjs,ts,tsx}',
  ],
  roots: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/ai_agent/skills/endpoint_response_actions',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/security_solution/public/ai_agent/skills/endpoint_response_actions',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/ai_agent/skills/endpoint_response_actions/*.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/security/plugins/security_solution/public/ai_agent/skills/endpoint_response_actions/index.ts',
  ],
};
