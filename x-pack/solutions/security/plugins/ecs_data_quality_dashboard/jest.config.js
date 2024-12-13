/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/security/plugins/ecs_data_quality_dashboard/{common,lib,server}/**/*.{ts,tsx}',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/security/plugins/ecs_data_quality_dashboard',
  coverageReporters: ['text', 'html'],
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/ecs_data_quality_dashboard'],
  preset: '@kbn/test',
};
