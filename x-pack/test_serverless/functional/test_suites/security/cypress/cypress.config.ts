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
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    specPattern: './e2e/**/noop.cy.ts', // <<== Delete this once the code below is un-commented
    // .skip() until we have solution for loading roles/users. See security-team issue 7614
    // supportFile: './support/e2e.js',
    // specPattern: './e2e/**/*.cy.ts',
    // setupNodeEvents: (on, config) => {
    //   // Reuse data loaders from endpoint management cypress setup
    //   setupEndpointDataLoaders(on, config);
    //   setupUserDataLoader(on, config, {});
    // },
  },
});
