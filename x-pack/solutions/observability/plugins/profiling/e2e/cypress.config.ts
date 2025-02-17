/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

export default defineCypressConfig({
  reporter: '../../../../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: './reporter_config.json',
  },
  fileServerFolder: './cypress',
  fixturesFolder: './cypress/fixtures',
  screenshotsFolder: './cypress/screenshots',
  videosFolder: './cypress/videos',
  defaultCommandTimeout: 60000,
  execTimeout: 120000,
  pageLoadTimeout: 120000,
  viewportHeight: 1800,
  viewportWidth: 1440,
  video: false,
  screenshotOnRunFailure: true,
  e2e: {
    baseUrl: 'http://localhost:5601',
    supportFile: './cypress/support/e2e.ts',
    specPattern: './cypress/e2e/**/*.cy.ts',
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 3,
    experimentalRunAllSpecs: true,
  },
});
