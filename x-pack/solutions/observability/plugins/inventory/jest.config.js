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
    '<rootDir>/x-pack/solutions/observability/plugins/inventory/public',
    '<rootDir>/x-pack/solutions/observability/plugins/inventory/common',
    '<rootDir>/x-pack/solutions/observability/plugins/inventory/server',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/observability/plugins/inventory/{public,common,server}/**/*.{js,ts,tsx}',
  ],

  coverageReporters: ['html'],
};
