/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/observability/plugins/synthetics'],
  // The real entry point loads the whole observability_shared plugin (seconds per test file);
  // tests get a shim that only exposes what synthetics uses.
  moduleNameMapper: {
    '^@kbn/observability-shared-plugin/public$':
      '<rootDir>/x-pack/solutions/observability/plugins/synthetics/public/apps/synthetics/utils/testing/observability_shared_public_shim.ts',
  },
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/solutions/observability/plugins/synthetics',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/observability/plugins/synthetics/{common,public,server}/**/*.{ts,tsx}',
  ],
};
