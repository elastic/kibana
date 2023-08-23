/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { defineCypressConfig } from '@kbn/cypress-config';
import { cloudPlugin } from 'cypress-cloud/plugin';
import path from 'path';
import { isSkipped } from '@kbn/security-solution-plugin/scripts/run_cypress/utils';
import { setupEnv } from '@kbn/osquery-plugin/cypress/support/setup_env';

console.error('path', path.resolve('.'));
// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  reporter: '../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: path.resolve('./reporter_config.json'),
  },
  defaultCommandTimeout: 150000,
  execTimeout: 150000,
  pageLoadTimeout: 150000,
  numTestsKeptInMemory: 0,
  retries: {
    runMode: 1,
  },
  screenshotsFolder: '../../../target/kibana-security-solution/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: true,
  videosFolder: '../../../target/kibana-security-solution/cypress/videos',
  viewportHeight: 946,
  viewportWidth: 1680,
  e2e: {
    experimentalMemoryManagement: true,
    experimentalInteractiveRunEvents: true,
    specPattern: ['./cypress/e2e', '!./cypress/e2e/investigations', '!./cypress/e2e/explore'],
    supportFile: './cypress/support/e2e_cloud.js',
    env: {
      FORCE_COLOR: '1',
      baseUrl: 'http://elastic:changeme@localhost:5620',
      BASE_URL: 'http://localhost:5620',
      ELASTICSEARCH_URL: 'http://system_indices_superuser:changeme@localhost:9222',
      ELASTICSEARCH_USERNAME: 'system_indices_superuser',
      ELASTICSEARCH_PASSWORD: 'changeme',
      FTR_CONFIG_FILE: path.resolve('../cli_config'),
    },
    async setupNodeEvents(on, config) {
      setupEnv(on, config);

      on('task', {
        isSkipped,
      });

      on('after:spec', (spec, results) => {
        if (results && results.video) {
          // Do we have failures for any retry attempts?
          const failures = results.tests.some((test) =>
            test.attempts.some((attempt) => attempt.state === 'failed')
          );
          if (!failures) {
            // delete the video if the spec passed and no tests retried
            fs.unlinkSync(results.video);
          }
        }
      });

      return cloudPlugin(on, config);
    },
  },
});
