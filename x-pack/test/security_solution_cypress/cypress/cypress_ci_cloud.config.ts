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
import { fork } from 'child_process';
import execa from 'execa';
import type { ChildProcess, IOType } from 'child_process';
import { esArchiver } from './support/es_archiver';
import { isSkipped } from '../../../security_solution/scripts/run_cypress/utils';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  reporter: '../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: path.resolve(__dirname, './reporter_config.json'),
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
    baseUrl: 'http://google.com',
    experimentalMemoryManagement: true,
    experimentalInteractiveRunEvents: true,
    specPattern: ['./cypress/e2e', '!./cypress/e2e/investigations', '!./cypress/e2e/explore'],
    supportFile: './cypress/support/e2e_cloud.js',
    env: {
      FORCE_COLOR: '1',
      baseUrl: 'http://elastic:changeme@localhost:5622',
      BASE_URL: 'http://localhost:5622',
      ELASTICSEARCH_URL: 'http://system_indices_superuser:changeme@localhost:9222',
      ELASTICSEARCH_USERNAME: 'system_indices_superuser',
      ELASTICSEARCH_PASSWORD: 'changeme',
    },
    async setupNodeEvents(on, config) {
      const esArchiverInstance = esArchiver(on, config);

      let processes: Record<string, ChildProcess> = {};

      on('task', {
        isSkipped,
      });

      on('before:spec', (spec) => {
        const isSkippedSpec = isSkipped(spec.absolute);

        if (!isSkippedSpec) {
          if (!processes[spec.relative]) {
            try {
              execa.commandSync('kill $(lsof -t -i:5622)', { shell: true });
              // eslint-disable-next-line no-empty
            } catch (e) {}
            try {
              execa.commandSync('kill $(lsof -t -i:9222)', { shell: true });
              // eslint-disable-next-line no-empty
            } catch (e) {}

            const program = path.resolve('../scripts/start_cypress_setup_env.js');
            const parameters = [
              `run --ftr-config-file '../../../test/security_solution_cypress/cli_config.ts' --spec-file-path '${spec.relative}'`,
            ];
            const options = {
              env: {
                NODE_OPTIONS: '--no-warnings',
                PATH: process.env.PATH,
                KIBANA_INSTALL_DIR: process.env.KIBANA_INSTALL_DIR,
                CI: process.env.CI,
              },
              stdio: [
                'inherit' as IOType,
                'inherit' as IOType,
                'inherit' as IOType,
                'ipc' as const,
              ],
            };

            const child = fork(program, parameters, options);

            processes[spec.relative] = child;

            return new Promise((resolve) => {
              child.on('message', () => {
                esArchiverInstance.load('auditbeat').then(() => {
                  resolve();
                });
              });
            });
          }
        }
      });

      on('after:spec', (spec, results) => {
        Object.values(processes).forEach((child) => {
          child.kill();
        });
        processes = {};

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
