/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The plugin `jest.config.js` has no `scripts` root, so the test setup scripts get their own config.
module.exports = {
  preset: '@kbn/jest/jest_node',
  rootDir: '../../../../../../..',
  roots: ['<rootDir>/x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed'],
};
