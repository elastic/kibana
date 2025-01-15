/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import _ from 'lodash';
import globby from 'globby';
import pMap from 'p-map';
import { withProcRunner } from '@kbn/dev-proc-runner';
import path from 'path';
import execa from 'execa';

import { EsVersion, FunctionalTestRunner, runElasticsearch, runKibanaServer } from '@kbn/test';

import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';

import { createFailError } from '@kbn/dev-cli-errors';
import pRetry from 'p-retry';
import type { ToolingLog } from '@kbn/tooling-log';
import { prefixedOutputLogger } from '../endpoint/common/utils';
import { createToolingLogger } from '../../common/endpoint/data_loaders/utils';
import { createKbnClient } from '../endpoint/common/stack_services';
import type { StartedFleetServer } from '../endpoint/common/fleet_server/fleet_server_services';
import { startFleetServer } from '../endpoint/common/fleet_server/fleet_server_services';
import { retrieveIntegrations } from './utils';
import { getFTRConfig } from './get_ftr_config';

/* eslint-disable @typescript-eslint/no-var-requires */

export async function mergeSummary(directories: string[], log: ToolingLog) {
  const combined = {
    durationInMS: 0,
    passed: [],
    skipped: [],
    failed: [],
    warned: [],
    timedOut: [],
    status: 'passed',
    startedAt: Number.MAX_SAFE_INTEGER,
  };

  directories.forEach((directory) => {
    try {
      const json = require(directory);
      combined.durationInMS += json.durationInMS;
      combined.passed = combined.passed.concat(json.passed);
      combined.skipped = combined.skipped.concat(json.skipped);
      combined.failed = combined.failed.concat(json.failed);
      combined.warned = combined.warned.concat(json.warned);
      combined.timedOut = combined.timedOut.concat(json.timedOut);
      combined.status = json.status === 'failed' ? 'failed' : combined.status;
      combined.startedAt =
        json.startedAt < combined.startedAt ? json.startedAt : combined.startedAt;
    } catch (err) {
      log.error(err);
    }
  });

  return combined;
}

export const cli = () => {
  run(
    async ({ log: _cliLogger }) => {
      const { argv } = yargs(process.argv.slice(2))
        .coerce('configFile', (arg) => (_.isArray(arg) ? _.last(arg) : arg))
        .coerce('spec', (arg) => (_.isArray(arg) ? _.last(arg) : arg))
        .coerce('env', (arg: string) =>
          arg.split(',').reduce((acc, curr) => {
            const [key, value] = curr.split('=');
            if (key === 'burn') {
              acc[key] = parseInt(value, 10);
            } else {
              acc[key] = value;
            }
            return acc;
          }, {} as Record<string, string | number>)
        )
        .boolean('inspect');

      _cliLogger.info(`
----------------------------------------------
Script arguments:
----------------------------------------------

${JSON.stringify(argv, null, 2)}

----------------------------------------------
`);

      const isOpen = argv._.includes('open');
      const cypressConfigFilePath = require.resolve(`../../${argv.configFile}`) as string;
      const cypressConfigFile = await import(cypressConfigFilePath);

      // if (cypressConfigFile.env?.TOOLING_LOG_LEVEL) {
      //   createToolingLogger.defaultLogLevel = cypressConfigFile.env.TOOLING_LOG_LEVEL;
      // }

      const log = prefixedOutputLogger('cy.parallel()', createToolingLogger());

      log.info(`
----------------------------------------------
Playwright config for file: ${cypressConfigFilePath}:
----------------------------------------------

${JSON.stringify(cypressConfigFile, null, 2)}

----------------------------------------------
`);

      const specConfig = cypressConfigFile.testMatch;
      const specArg = argv.spec;
      const specPattern = specArg ?? specConfig;

      log.info('Config spec pattern:', specConfig);
      log.info('Arguments spec pattern:', specArg);
      log.info('Resulting spec pattern:', specPattern);

      const files = retrieveIntegrations(globby.sync(specPattern));

      log.info('Resolved spec files after retrieveIntegrations:', files);

      if (!files?.length) {
        log.info('No tests found');
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

      const esPorts: number[] = [9200, 9220];
      const kibanaPorts: number[] = [5601, 5620];
      const fleetServerPorts: number[] = [8220];

      const getEsPort = <T>(): T | number => {
        if (isOpen) {
          return 9220;
        }

        const esPort = parseInt(`92${Math.floor(Math.random() * 89) + 10}`, 10);
        if (esPorts.includes(esPort)) {
          return getEsPort();
        }
        esPorts.push(esPort);
        return esPort;
      };

      const getKibanaPort = <T>(): T | number => {
        if (isOpen) {
          return 5620;
        }

        const kibanaPort = parseInt(`56${Math.floor(Math.random() * 89) + 10}`, 10);
        if (kibanaPorts.includes(kibanaPort)) {
          return getKibanaPort();
        }
        kibanaPorts.push(kibanaPort);
        return kibanaPort;
      };

      const getFleetServerPort = <T>(): T | number => {
        if (isOpen) {
          return 8220;
        }

        const fleetServerPort = parseInt(`82${Math.floor(Math.random() * 89) + 10}`, 10);
        if (fleetServerPorts.includes(fleetServerPort)) {
          return getFleetServerPort();
        }
        fleetServerPorts.push(fleetServerPort);
        return fleetServerPort;
      };

      const cleanupServerPorts = ({
        esPort,
        kibanaPort,
        fleetServerPort,
      }: {
        esPort: number;
        kibanaPort: number;
        fleetServerPort: number;
      }) => {
        _.pull(esPorts, esPort);
        _.pull(kibanaPorts, kibanaPort);
        _.pull(fleetServerPorts, fleetServerPort);
      };

      const failedSpecFilePaths: string[] = [];

      const runSpecs = async (filePaths: string[]) =>
        pMap<
          string,
          | CypressCommandLine.CypressRunResult
          | CypressCommandLine.CypressFailedRunResult
          | undefined
        >(
          filePaths,
          async (filePath) => {
            let result:
              | CypressCommandLine.CypressRunResult
              | CypressCommandLine.CypressFailedRunResult
              | undefined;
            failedSpecFilePaths.push(filePath);

            await withProcRunner<
              | CypressCommandLine.CypressRunResult
              | CypressCommandLine.CypressFailedRunResult
              | undefined
            >(log, async (procs) => {
              const abortCtrl = new AbortController();

              const onEarlyExit = (msg: string) => {
                log.error(msg);
                abortCtrl.abort();
              };

              const esPort: number = getEsPort();
              const kibanaPort: number = getKibanaPort();
              const fleetServerPort: number = getFleetServerPort();
              const specFileFTRConfig = { ftrConfig: {} }; // parseTestFileConfig(filePath);
              const ftrConfigFilePath = path.resolve(
                _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile
              );

              const config = await getFTRConfig({
                log,
                esPort,
                kibanaPort,
                fleetServerPort,
                ftrConfigFilePath,
                specFilePath: filePath,
                specFileFTRConfig: specFileFTRConfig.ftrConfig,
              });

              const createUrlFromFtrConfig = (
                type: 'elasticsearch' | 'kibana' | 'fleetserver',
                withAuth: boolean = false
              ): string => {
                const getKeyPath = (keyPath: string = ''): string => {
                  return `servers.${type}${keyPath ? `.${keyPath}` : ''}`;
                };

                if (!config.get(getKeyPath())) {
                  throw new Error(`Unable to create URL for ${type}. Not found in FTR config at `);
                }

                const url = new URL('http://localhost');

                url.port = config.get(getKeyPath('port'));
                url.protocol = config.get(getKeyPath('protocol'));
                url.hostname = config.get(getKeyPath('hostname'));

                if (withAuth) {
                  url.username = config.get(getKeyPath('username'));
                  url.password = config.get(getKeyPath('password'));
                }

                return url.toString().replace(/\/$/, '');
              };

              const baseUrl = createUrlFromFtrConfig('kibana');

              //               log.info(`
              // ----------------------------------------------
              // Playwright FTR setup for file: ${filePath}:
              // ----------------------------------------------

              // ${JSON.stringify(
              //   config.getAll(),
              //   (key, v) => {
              //     if (Array.isArray(v) && v.length > 32) {
              //       return v.slice(0, 32).concat('... trimmed after 32 items.');
              //     } else {
              //       return v;
              //     }
              //   },
              //   2
              // )}

              // ----------------------------------------------
              // `);

              const lifecycle = new Lifecycle(log);

              const providers = new ProviderCollection(log, [
                ...readProviderSpec('Service', {
                  lifecycle: () => lifecycle,
                  log: () => log,
                  config: () => config,
                }),
                ...readProviderSpec('Service', config.get('services')),
              ]);

              const options = {
                installDir: process.env.KIBANA_INSTALL_DIR,
                ci: process.env.CI,
              };

              // Setup fleet if Cypress config requires it
              let fleetServer: void | StartedFleetServer;
              let shutdownEs;

              try {
                shutdownEs = await pRetry(
                  async () =>
                    runElasticsearch({
                      config,
                      log,
                      name: `ftr-${esPort}`,
                      esFrom: config.get('esTestCluster')?.from || 'snapshot',
                      onEarlyExit,
                    }),
                  { retries: 2, forever: false }
                );
                await runKibanaServer({
                  procs,
                  config,
                  installDir: options?.installDir,
                  extraKbnOpts:
                    options?.installDir || options?.ci || !isOpen
                      ? []
                      : ['--dev', '--no-dev-credentials'],
                  onEarlyExit,
                  inspect: argv.inspect,
                });
                if (cypressConfigFile.env?.WITH_FLEET_SERVER) {
                  log.info(`Setting up fleet-server for this Cypress config`);
                  const kbnClient = createKbnClient({
                    url: baseUrl,
                    username: config.get('servers.kibana.username'),
                    password: config.get('servers.kibana.password'),
                    log,
                  });
                  fleetServer = await pRetry(
                    async () =>
                      startFleetServer({
                        kbnClient,
                        logger: log,
                        port:
                          fleetServerPort ?? config.has('servers.fleetserver.port')
                            ? (config.get('servers.fleetserver.port') as number)
                            : undefined,
                        // `force` is needed to ensure that any currently running fleet server (perhaps left
                        // over from an interrupted run) is killed and a new one restarted
                        force: true,
                      }),
                    { retries: 2, forever: false }
                  );
                }
                await providers.loadAll();
                const functionalTestRunner = new FunctionalTestRunner(
                  log,
                  config,
                  EsVersion.getDefault()
                );
                const ftrEnv = await pRetry(() => functionalTestRunner.run(abortCtrl.signal), {
                  retries: 1,
                });
                log.debug(
                  `Env. variables returned by [functionalTestRunner.run()]:\n`,
                  JSON.stringify(ftrEnv, null, 2)
                );

                const baseDir = path.resolve(
                  __dirname,
                  `../../../../../target/kibana-security-solution/playwright/`
                );

                // Normalized the set of available env vars in cypress
                const cyCustomEnv = {
                  ...ftrEnv,
                  // NOTE:
                  // ELASTICSEARCH_URL needs to be created here with auth because SIEM cypress setup depends on it. At some
                  // points we should probably try to refactor that code to use `ELASTICSEARCH_URL_WITH_AUTH` instead
                  ELASTICSEARCH_URL:
                    ftrEnv.ELASTICSEARCH_URL ?? createUrlFromFtrConfig('elasticsearch', true),
                  ELASTICSEARCH_URL_WITH_AUTH: createUrlFromFtrConfig('elasticsearch', true),
                  ELASTICSEARCH_USERNAME:
                    ftrEnv.ELASTICSEARCH_USERNAME ?? config.get('servers.elasticsearch.username'),
                  ELASTICSEARCH_PASSWORD:
                    ftrEnv.ELASTICSEARCH_PASSWORD ?? config.get('servers.elasticsearch.password'),
                  FLEET_SERVER_URL: createUrlFromFtrConfig('fleetserver'),
                  KIBANA_URL: baseUrl,
                  KIBANA_URL_WITH_AUTH: createUrlFromFtrConfig('kibana', true),
                  KIBANA_USERNAME: config.get('servers.kibana.username'),
                  KIBANA_PASSWORD: config.get('servers.kibana.password'),
                  IS_SERVERLESS: config.get('serverless'),
                  OUTPUT_DIR: path.resolve(baseDir, filePath.replace('.spec.ts', '')),
                  PLAYWRIGHT_JSON_OUTPUT_FILE: path.resolve(
                    baseDir,
                    `json-report/`,
                    filePath.replace('.spec.ts', '.json')
                  ),
                  PLAYWRIGHT_JUNIT_OUTPUT_FILE: path.resolve(
                    baseDir,
                    `junit-report/`,
                    filePath.replace('.spec.ts', '.xml')
                  ),
                  PLAYWRIGHT_SUMMARY_JSON_OUTPUT_FILE: path.resolve(
                    baseDir,
                    `summary-report/`,
                    filePath.replace('.spec.ts', '.json')
                  ),
                  ...argv.env,
                };
                log.info(`
                ----------------------------------------------
                Playwright run ENV for file: ${filePath}:
                ----------------------------------------------
                ${JSON.stringify(cyCustomEnv, null, 2)}
                ----------------------------------------------
                `);

                if (
                  !fs.existsSync(
                    path.resolve(
                      __dirname,
                      '../../../../../target/kibana-security-solution/playwright/'
                    )
                  )
                ) {
                  fs.mkdirSync(
                    path.resolve(
                      __dirname,
                      '../../../../../target/kibana-security-solution/playwright/'
                    ),
                    { recursive: true }
                  );
                }

                if (!fs.existsSync(path.resolve(__dirname, '../../../../../.ftr'))) {
                  fs.mkdirSync(path.resolve(__dirname, '../../../../../.ftr'), { recursive: true });
                }

                fs.writeFileSync(
                  path.resolve(__dirname, '../../../../../.ftr/playwright.env'),
                  Object.entries(cyCustomEnv)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n')
                );

                if (isOpen) {
                  await execa.command(
                    `npx playwright test --config ${cypressConfigFilePath} --grep ${filePath.substring(
                      filePath.indexOf('/') + 1
                    )} --ui`,
                    {
                      env: {
                        ...cyCustomEnv,
                      },
                      stdout: process.stdout,
                    }
                  );
                } else {
                  await execa.command(
                    `npx playwright test --config ${cypressConfigFilePath} --grep ${filePath.substring(
                      filePath.indexOf('/') + 1
                    )}`,
                    {
                      env: {
                        ...cyCustomEnv,
                      },
                      stdout: process.stdout,
                    }
                  );
                  _.pull(failedSpecFilePaths, filePath);
                }
              } catch (error) {
                log.error(error);
              }

              if (fleetServer) {
                await fleetServer.stop();
              }

              await procs.stop('kibana');
              await shutdownEs?.();
              cleanupServerPorts({ esPort, kibanaPort, fleetServerPort });

              return result;
            });
            return result;
          },
          {
            concurrency: 1,
          }
        );

      await runSpecs(files);

      const results = await mergeSummary(
        globby.sync(
          path.resolve(
            __dirname,
            '../../../../../target/kibana-security-solution/playwright/summary-report/**/*.json'
          )
        ),
        _cliLogger
      );

      if (results.status === 'failed') {
        throw createFailError('Not all tests passed');
      }
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
