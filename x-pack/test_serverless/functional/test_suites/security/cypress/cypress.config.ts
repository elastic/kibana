/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

export default defineCypressConfig({
  defaultCommandTimeout: 60000,
  execTimeout: 60000,
  pageLoadTimeout: 60000,
  responseTimeout: 60000,
  screenshotsFolder: '../../../../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  viewportHeight: 946,
  viewportWidth: 1680,
  numTestsKeptInMemory: 10,
  e2e: {
    baseUrl: 'http://localhost:5620/app/security/get_started',
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    supportFile: './support/e2e.js',
    specPattern: './e2e/**/*.cy.ts',
  },
});
