/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { esArchiver } from './support/es_archiver';
import { samlAuthentication } from './support/saml_auth';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  defaultCommandTimeout: 60000,
  execTimeout: 60000,
  pageLoadTimeout: 60000,
  responseTimeout: 60000,
  screenshotsFolder: '../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-security-solution/cypress/videos',
  viewportHeight: 946,
  viewportWidth: 1680,
  numTestsKeptInMemory: 10,
  env: {
    grepFilterSpecs: true,
    grepTags: '@serverless --@brokenInServerless --@skipInServerless',
  },
  e2e: {
    experimentalCspAllowList: ['default-src', 'script-src', 'script-src-elem'],
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    setupNodeEvents(on, config) {
      esArchiver(on, config);
      samlAuthentication(on, config);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
  },
});
