/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { esArchiver } from './support/es_archiver';

const registerReportPortalPlugin = require('@reportportal/agent-js-cypress/lib/plugin');

export default defineCypressConfig({
  defaultCommandTimeout: 60000,
  env: {
    grepFilterSpecs: true,
    grepTags: '@ess',
  },
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
  reporter: '@reportportal/agent-js-cypress',
  reporterOptions: {
    endpoint: 'http://35.226.254.46:8080/api/v1',
    apiKey: 'cypress_KHgP4q-hSDmG5WeXnqN_qGOoHF3oQsYbBqjqKoxrXGgCov3OTpfeqYYZIhRA8Faw',
    launch: 'serverless_security_solution_cypress_tests',
    project: 'serverless_security_solution_cypress',
    description: 'LAUNCH_DESCRIPTION',
    attributes: [],
    mode: 'DEFAULT',
  },
  e2e: {
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    experimentalCspAllowList: ['default-src', 'script-src', 'script-src-elem'],
    setupNodeEvents(on, config) {
      esArchiver(on, config);
      registerReportPortalPlugin(on, config);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
  },
});
