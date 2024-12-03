/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { esArchiver } from './support/es_archiver';
import { samlAuthentication } from './support/saml_auth';
import { esClient } from './support/es_client';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  reporter: '../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: './cypress/reporter_config.json',
  },
  chromeWebSecurity: false,
  defaultCommandTimeout: 300000,
  env: {
    grepFilterSpecs: true,
    grepOmitFiltered: true,
    grepTags: '@serverless --@skipInServerless --@skipInServerlessMKI',
  },
  execTimeout: 300000,
  pageLoadTimeout: 300000,
  numTestsKeptInMemory: 0,
  requestTimeout: 300000,
  responseTimeout: 300000,
  retries: {
    runMode: 1,
  },
  screenshotsFolder: '../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: true,
  videosFolder: '../../../../target/kibana-security-solution/cypress/videos',
  viewportHeight: 1200,
  viewportWidth: 1920,
  e2e: {
    baseUrl: 'http://localhost:5601',
    experimentalCspAllowList: ['default-src', 'script-src', 'script-src-elem'],
    experimentalMemoryManagement: true,
    specPattern: './cypress/e2e/**/*.cy.ts',
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push('--window-size=1920,1200');
          return launchOptions;
        }
        if (browser.family === 'chromium') {
          launchOptions.args.push(
            '--js-flags="--max_old_space_size=4096 --max_semi_space_size=1024"'
          );
        }
        return launchOptions;
      });

      esArchiver(on, config);

      samlAuthentication(on, config);
      esClient(on, config);
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);

      return config;
    },
  },
});
