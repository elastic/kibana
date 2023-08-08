/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { setupDataLoaderTasks } from './support/setup_data_loader_tasks';

// eslint-disable-next-line import/no-default-export
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
    'cypress-react-selector': {
      root: '#osquery-app',
    },
    grepFilterSpecs: true,
    grepTags: '@serverless --@brokenInServerless',
  },

  e2e: {
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    supportFile: './support/e2e.js',
    specPattern: '../../../../../plugins/osquery/cypress/e2e/**/*.cy.ts',
    setupNodeEvents: (on, config) => {
      setupDataLoaderTasks(on, config);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
  },
});
