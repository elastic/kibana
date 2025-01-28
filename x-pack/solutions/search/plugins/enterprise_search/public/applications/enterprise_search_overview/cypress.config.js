/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

export default defineCypressConfig({
  defaultCommandTimeout: 120000,
  e2e: {
    baseUrl: 'http://localhost:5601',
    supportFile: false,
  },
  env: {
    password: 'changeme',
    username: 'elastic',
  },
  execTimeout: 120000,
  fixturesFolder: false,
  pageLoadTimeout: 180000,
  retries: {
    runMode: 2,
  },
  screenshotsFolder: '../../../target/cypress/screenshots',
  video: false,
  videosFolder: '../../../target/cypress/videos',
  viewportHeight: 1200,
  viewportWidth: 1600,
});
