/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';
import { esArchiver } from './support/es_archiver';
import { esClient } from './support/es_client';

export default defineCypressConfig({
  chromeWebSecurity: false,
  defaultCommandTimeout: 60000,
  env: {
    grepFilterSpecs: true,
    grepTags: '@ess --@skipInEss',
  },
  execTimeout: 60000,
  pageLoadTimeout: 60000,
  responseTimeout: 60000,
  screenshotsFolder: '../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../target/kibana-security-solution/cypress/videos',
  viewportHeight: 1200,
  viewportWidth: 1920,
  numTestsKeptInMemory: 10,
  e2e: {
    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    experimentalCspAllowList: ['default-src', 'script-src', 'script-src-elem'],
    setupNodeEvents(on, config) {
      esArchiver(on, config);
      esClient(on, config);
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
  },
});
