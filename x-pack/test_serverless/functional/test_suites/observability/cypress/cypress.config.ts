/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { kbnTestConfig, kibanaTestSuperuserServerless } from '@kbn/test';

import Url from 'url';

const kibanaUrlWithoutAuth = Url.format({
  protocol: 'https',
  hostname: kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).hostname,
  port: kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).port,
});

export default defineCypressConfig({
  fileServerFolder: './cypress',
  fixturesFolder: './cypress/fixtures',
  screenshotsFolder: './cypress/screenshots',
  videosFolder: './cypress/videos',
  requestTimeout: 10000,
  responseTimeout: 40000,
  defaultCommandTimeout: 30000,
  execTimeout: 120000,
  pageLoadTimeout: 120000,
  viewportHeight: 1800,
  viewportWidth: 1440,
  video: false,
  screenshotOnRunFailure: false,
  retries: {
    runMode: 1,
  },
  e2e: {
    baseUrl: 'https://localhost:5620',
    supportFile: './support/e2e.ts',
    specPattern: './e2e/**/*.cy.ts',
  },
  env: {
    username: kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).username,
    password: kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).password,
    kibanaUrlWithoutAuth,
  },
});
