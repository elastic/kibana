/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  // The state test boots a Kibana root, and core leaves a timer running after the root shuts down.
  // In the node environment nothing clears it, so without this Jest never exits and the CI job
  // runs into its time limit.
  forceExit: true,
  preset: '@kbn/jest/jest_integration_node',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/observability/plugins/nightshift_detection'],
  testMatch: ['**/integration_tests/**/*.test.ts'],
};
