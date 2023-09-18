/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { dataLoaders as setupEndpointDataLoaders } from '@kbn/security-solution-plugin/public/management/cypress/support/data_loaders';
import { setupUserDataLoader } from './support/setup_data_loader_tasks';

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
  env: {
    KIBANA_USERNAME: 'system_indices_superuser',
    KIBANA_PASSWORD: 'changeme',
    ELASTICSEARCH_USERNAME: 'system_indices_superuser',
    ELASTICSEARCH_PASSWORD: 'changeme',
  },
  e2e: {
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    supportFile: './support/e2e.js',
    specPattern: './e2e/**/*.cy.ts',
    setupNodeEvents: (on, config) => {
      // Reuse data loaders from endpoint management cypress setup
      setupEndpointDataLoaders(on, config);
      setupUserDataLoader(on, config, {});
    },
  },
});
