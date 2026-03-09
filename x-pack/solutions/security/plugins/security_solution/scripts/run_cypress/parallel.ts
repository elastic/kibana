/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import _ from 'lodash';
import globby from 'globby';
import pMap from 'p-map';
import { withProcRunner } from '@kbn/dev-proc-runner';
import cypress from 'cypress';
import { findChangedFiles } from 'find-cypress-specs';
import path from 'path';
import grep from '@cypress/grep/src/plugin';

import { EsVersion, FunctionalTestRunner, runElasticsearch, runKibanaServer } from '@kbn/test';

import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';

import { createFailError } from '@kbn/dev-cli-errors';
import pRetry from 'p-retry';
import { prefixedOutputLogger } from '../endpoint/common/utils';
import { createToolingLogger } from '../../common/endpoint/data_loaders/utils';
import { createKbnClient } from '../endpoint/common/stack_services';
import type { StartedFleetServer } from '../endpoint/common/fleet_server/fleet_server_services';
import { startFleetServer } from '../endpoint/common/fleet_server/fleet_server_services';
import { renderSummaryTable } from './print_run';
import {
  groupSpecsByFtrConfig,
  orderSpecFilesForLoadBalance,
  parseTestFileConfig,
  retrieveIntegrations,
  retrieveIntegrationsConfigAware,
  setDefaultToolingLoggingLevel,
} from './utils';
import type { SpecGroup } from './utils';
import { getFTRConfig } from './get_ftr_config';
import { DW_LOAD_BALANCER_CONFIG } from './dw_config';
import { isInBuildkite, isSpecCompleted, markSpecCompleted } from './buildkite_checkpoint';

const filterCompletedSpecs = async (
  specFiles: string[],
  logger: { info: (...args: unknown[]) => void }
): Promise<{ remaining: string[]; skippedCount: number }> => {
  const completionStatus = await Promise.all(
    specFiles.map(async (filePath) => {
      const completed = await isSpecCompleted(filePath);
      logger.info(`[cypress-checkpoint]   ${completed ? 'SKIP' : 'RUN '} ${filePath}`);
      return { filePath, completed };
    })
  );

  const skipped = completionStatus.filter((s) => s.completed);
  const remaining = completionStatus.filter((s) => !s.completed).map((s) => s.filePath);

  if (skipped.length > 0) {
    logger.info(
      `[cypress-checkpoint] Resumed: skipped ${skipped.length} already-completed, ` +
        `${remaining.length} remaining`
    );
  } else {
    logger.info(
      `[cypress-checkpoint] No prior checkpoints found, running all ${remaining.length} specs`
    );
  }

  return { remaining, skippedCount: skipped.length };
};

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

      const USE_CHROME_BETA = process.env.USE_CHROME_BETA?.match(/(1|true)/i);

      _cliLogger.info(`
----------------------------------------------
Script arguments:
----------------------------------------------

${JSON.stringify(argv, null, 2)}

----------------------------------------------
`);

      const isOpen = argv._.includes('open');
      const cypressConfigFilePath = require.resolve(`../../../../${argv.configFile}`) as string;
      const cypressConfigFile = await import(cypressConfigFilePath);

      // Adjust tooling log level based on the `TOOLING_LOG_LEVEL` property, which can be
      // defined in the cypress config file or set in the `env`
      setDefaultToolingLoggingLevel(cypressConfigFile?.env?.TOOLING_LOG_LEVEL);

      const log = prefixedOutputLogger('cy.parallel()', createToolingLogger());

      log.info(`
----------------------------------------------
Cypress config for file: ${cypressConfigFilePath}:
----------------------------------------------

${JSON.stringify(cypressConfigFile, null, 2)}

----------------------------------------------
`);

      const specConfig = cypressConfigFile.e2e.specPattern;
      const specArg = argv.spec;
      const specPattern = specArg ?? specConfig;
      const excludeSpecPattern = cypressConfigFile.e2e.excludeSpecPattern;

      log.info('Config spec pattern:', specConfig);
      log.info('Exclude spec pattern:', excludeSpecPattern);
      log.info('Arguments spec pattern:', specArg);
      log.info('Resulting spec pattern:', specPattern);

      // The grep function will filter Cypress specs by tags: it will include and exclude
      // spec files according to the tags configuration.
      const grepSpecPattern = grep({
        ...cypressConfigFile,
        specPattern,
        excludeSpecPattern: [],
      }).specPattern;

      log.info('Resolved spec files or pattern after grep:', grepSpecPattern);

      const isGrepReturnedFilePaths = _.isArray(grepSpecPattern);
      const isGrepReturnedSpecPattern = !isGrepReturnedFilePaths && grepSpecPattern === specPattern;
      const grepFilterSpecs = cypressConfigFile.env?.grepFilterSpecs;

      // IMPORTANT!
      // When grep returns the same spec pattern as it gets in its arguments, we treat it as
      // it couldn't find any concrete specs to execute (maybe because all of them are skipped).
      // In this case, we do an early return - it's important to do that.
      // If we don't return early, these specs will start executing, and Cypress will be skipping
      // tests at runtime: those that should be excluded according to the tags passed in the config.
      // This can take so much time that the job can fail by timeout in CI.
      if (grepFilterSpecs && isGrepReturnedSpecPattern) {
        log.info('No tests found - all tests could have been skipped via Cypress tags');
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

      const concreteFilePaths = isGrepReturnedFilePaths
        ? grepSpecPattern // use the returned concrete file paths
        : globby.sync(
            specPattern,
            excludeSpecPattern
              ? {
                  ignore: excludeSpecPattern,
                }
              : undefined
          ); // convert the glob pattern to concrete file paths

      const shareStacks = process.env.CYPRESS_SHARE_STACKS === 'true';

      let files: string[];
      if (shareStacks) {
        files = retrieveIntegrationsConfigAware(concreteFilePaths, DW_LOAD_BALANCER_CONFIG);
      } else {
        const orderedFilePaths = orderSpecFilesForLoadBalance(
          concreteFilePaths,
          DW_LOAD_BALANCER_CONFIG
        );
        files = retrieveIntegrations(orderedFilePaths, DW_LOAD_BALANCER_CONFIG);
      }

      log.info('Resolved spec files after retrieveIntegrations:', files);

      if (argv.changedSpecsOnly) {
        files = (findChangedFiles('main', false) as string[]).reduce((acc, itemPath) => {
          const existing = files.find((grepFilePath) => grepFilePath.includes(itemPath));
          if (existing) {
            acc.push(existing);
          }
          return acc;
        }, [] as string[]);

        // to avoid running too many tests, we limit the number of files to 3
        // we may extend this in the future
        files = files.slice(0, 3);
      }

      let checkpointSkippedCount = 0;

      // Checkpoint resume: on Buildkite retry, skip specs that already passed on a previous attempt
      if (!isOpen && isInBuildkite()) {
        log.info(
          `[cypress-checkpoint] Checking ${files.length} specs for prior completion ` +
            `(step=${process.env.BUILDKITE_STEP_ID || ''}, ` +
            `job=${process.env.BUILDKITE_PARALLEL_JOB || '0'}, ` +
            `retry=${process.env.BUILDKITE_RETRY_COUNT || '0'})`
        );

        await filterCompletedSpecs(files, log).then((checkpoint) => {
          files = checkpoint.remaining;
          checkpointSkippedCount = checkpoint.skippedCount;
        });
      }

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
      const infraFailedSpecFilePaths: string[] = [];

      const isTestAssertionFailure = (
        runResult:
          | CypressCommandLine.CypressRunResult
          | CypressCommandLine.CypressFailedRunResult
          | undefined
      ): boolean => {
        if (!runResult) return false;
        const asRunResult = runResult as CypressCommandLine.CypressRunResult;
        return Boolean(asRunResult.totalFailed && asRunResult.totalFailed > 0 && asRunResult.runs);
      };

      const runSpecGroups = async (
        specGroups: SpecGroup[],
        isRetryRun: boolean = false
      ): Promise<
        Array<
          | CypressCommandLine.CypressRunResult
          | CypressCommandLine.CypressFailedRunResult
          | undefined
        >
      > => {
        const allResults: Array<
          | CypressCommandLine.CypressRunResult
          | CypressCommandLine.CypressFailedRunResult
          | undefined
        > = [];

        for (const group of specGroups) {
          const groupResults = await runSpecGroup(group, isRetryRun);
          allResults.push(...groupResults);
        }

        return allResults;
      };

      const runSpecGroup = async (
        group: SpecGroup,
        isRetryRun: boolean
      ): Promise<
        Array<
          | CypressCommandLine.CypressRunResult
          | CypressCommandLine.CypressFailedRunResult
          | undefined
        >
      > => {
        const results: Array<
          | CypressCommandLine.CypressRunResult
          | CypressCommandLine.CypressFailedRunResult
          | undefined
        > = [];

        const esPort: number = getEsPort();
        const kibanaPort: number = getKibanaPort();
        const fleetServerPort: number = getFleetServerPort();

        const firstFilePath = group.specFilePaths[0];
        const specFileFTRConfig = group.ftrConfig;
        const ftrConfigFilePath = path.resolve(
          _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile
        );

        await withProcRunner(log, async (procs) => {
          const abortCtrl = new AbortController();

          const onEarlyExit = (msg: string) => {
            log.error(msg);
            abortCtrl.abort();
          };

          const config = await getFTRConfig({
            log,
            esPort,
            kibanaPort,
            fleetServerPort,
            ftrConfigFilePath,
            specFilePath: firstFilePath,
            specFileFTRConfig,
            isOpen,
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

          log.info(`
----------------------------------------------
Cypress FTR setup for config group (${group.specFilePaths.length} spec(s)):
  Config key: ${group.configKey}
  Specs: ${group.specFilePaths.map((f) => path.basename(f)).join(', ')}
----------------------------------------------

${JSON.stringify(
  config.getAll(),
  (key, v) => {
    if (Array.isArray(v) && v.length > 32) {
      return v.slice(0, 32).concat('... trimmed after 32 items.');
    } else {
      return v;
    }
  },
  2
)}

----------------------------------------------
`);

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

          let fleetServer: StartedFleetServer | undefined;
          let shutdownEs;

          const esFromEnv = process.env.CYPRESS_ES_FROM;
          const configEsFrom = config.get('esTestCluster.from');
          const esFrom = esFromEnv || (configEsFrom === 'serverless' ? 'serverless' : 'docker');

          try {
            shutdownEs = await pRetry(
              async () =>
                runElasticsearch({
                  config,
                  log,
                  name: `ftr-${esPort}`,
                  esFrom,
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
                  : ['--dev', '--no-dev-config', '--no-dev-credentials'],
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

            const cyCustomEnv = {
              ...ftrEnv,

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

              ...argv.env,
            };

            for (const filePath of group.specFilePaths) {
              failedSpecFilePaths.push(filePath);

              log.info(`
----------------------------------------------
Cypress run ENV for file: ${filePath}:
----------------------------------------------

${JSON.stringify(cyCustomEnv, null, 2)}

----------------------------------------------
`);

              const executeCypressRun = async (retryAttempt: boolean) => {
                if (retryAttempt) {
                  process.env.CYPRESS_RETRY_RUN = 'true';
                }

                return cypress.run({
                  browser: USE_CHROME_BETA ? 'chrome:beta' : 'chrome',
                  spec: filePath,
                  configFile: cypressConfigFilePath,
                  reporter: argv.reporter as string,
                  reporterOptions: argv.reporterOptions,
                  headed: argv.headed as boolean,
                  config: {
                    e2e: {
                      baseUrl,
                    },
                    numTestsKeptInMemory: 0,
                    video: retryAttempt,
                    env: cyCustomEnv,
                  },
                  runnerUi: !process.env.CI,
                });
              };

              if (isOpen) {
                await cypress.open({
                  configFile: cypressConfigFilePath,
                  config: {
                    e2e: {
                      baseUrl,
                    },
                    env: cyCustomEnv,
                  },
                });
              } else {
                let runResult = await executeCypressRun(isRetryRun);

                if (isTestAssertionFailure(runResult) && !isRetryRun) {
                  log.info(
                    `Test assertion failure detected for ${filePath}, retrying in-place against the same stack (with video enabled)...`
                  );
                  runResult = await executeCypressRun(true);
                }

                results.push(runResult);

                if (!(runResult as CypressCommandLine.CypressRunResult)?.totalFailed) {
                  _.pull(failedSpecFilePaths, filePath);
                  if (!isOpen && isInBuildkite()) {
                    markSpecCompleted(filePath).catch(() => {});
                  }
                }
              }
            }
          } catch (error) {
            log.error(error);

            for (const filePath of group.specFilePaths) {
              if (failedSpecFilePaths.includes(filePath)) {
                infraFailedSpecFilePaths.push(filePath);
              }
            }

            results.push({
              status: 'failed',
              failures: 1,
              message: error.message,
            });
          }

          if (fleetServer) {
            await fleetServer.stop();
          }

          await procs.stop('kibana');
          await shutdownEs?.();
          cleanupServerPorts({ esPort, kibanaPort, fleetServerPort });
        });

        return results;
      };

      if (shareStacks) {
        const specGroups = groupSpecsByFtrConfig(files);

        log.info(`
----------------------------------------------
Spec groups by FTR config (${specGroups.length} group(s), ${files.length} spec(s) total):
----------------------------------------------
${specGroups
  .map(
    (g, i) =>
      `  Group ${i + 1} [${
        g.configKey === '{"license":"","kbnServerArgs":[],"productTypes":[]}'
          ? 'default'
          : g.configKey
      }]: ${g.specFilePaths.length} spec(s)\n${g.specFilePaths
        .map((f) => `    - ${path.basename(f)}`)
        .join('\n')}`
  )
  .join('\n')}
----------------------------------------------
`);

        const initialResults = await runSpecGroups(specGroups);

        // Only rebuild the full stack for specs that had infrastructure failures.
        // Test assertion failures were already retried in-place against the same stack.
        const specsNeedingInfraRetry = [...infraFailedSpecFilePaths];
        const retryGroups = groupSpecsByFtrConfig(specsNeedingInfraRetry);
        const retryResults = await runSpecGroups(retryGroups, true);

        const finalResults = [
          ..._.filter(
            initialResults,
            (initialResult: CypressCommandLine.CypressRunResult) =>
              initialResult?.runs &&
              _.some(
                initialResult?.runs,
                (runResult) => !failedSpecFilePaths.includes(runResult.spec.absolute)
              )
          ),
          ..._.filter(retryResults, (retryResult) => !!retryResult),
        ] as CypressCommandLine.CypressRunResult[];

        try {
          if (checkpointSkippedCount > 0) {
            log.info(
              `[cypress-checkpoint] ${checkpointSkippedCount} spec(s) were skipped ` +
                `(completed on a previous attempt)`
            );
          }
          renderSummaryTable(finalResults);
        } catch (e) {
          log.error('Failed to render summary table');
          log.error(e);
        }

        const hasFailedTests = (
          runResults: Array<
            | CypressCommandLine.CypressFailedRunResult
            | CypressCommandLine.CypressRunResult
            | undefined
          >
        ) =>
          _.some(
            runResults,
            (runResult) =>
              (runResult as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
              (runResult as CypressCommandLine.CypressRunResult)?.totalFailed
          );

        const hasFailedInitialTests = hasFailedTests(initialResults);
        const hasFailedRetryTests = hasFailedTests(retryResults);

        if (
          (hasFailedRetryTests && failedSpecFilePaths.length) ||
          (hasFailedInitialTests && !retryResults.length)
        ) {
          throw createFailError('Not all tests passed');
        }
      } else {
        const runSpecs = async (filePaths: string[], isRetryRun: boolean = false) =>
          pMap<
            string,
            | CypressCommandLine.CypressRunResult
            | CypressCommandLine.CypressFailedRunResult
            | undefined
          >(
            filePaths,
            async (filePath) => {
              const group: SpecGroup = {
                configKey: '',
                ftrConfig: parseTestFileConfig(filePath),
                specFilePaths: [filePath],
              };
              const groupResults = await runSpecGroup(group, isRetryRun);
              return groupResults[0];
            },
            { concurrency: 1 }
          );

        const initialResults = await runSpecs(files);

        const specsNeedingInfraRetry = [...infraFailedSpecFilePaths];
        const retryResults = await runSpecs(specsNeedingInfraRetry, true);

        const finalResults = [
          ..._.filter(
            initialResults,
            (initialResult: CypressCommandLine.CypressRunResult) =>
              initialResult?.runs &&
              _.some(
                initialResult?.runs,
                (runResult) => !failedSpecFilePaths.includes(runResult.spec.absolute)
              )
          ),
          ..._.filter(retryResults, (retryResult) => !!retryResult),
        ] as CypressCommandLine.CypressRunResult[];

        try {
          if (checkpointSkippedCount > 0) {
            log.info(
              `[cypress-checkpoint] ${checkpointSkippedCount} spec(s) were skipped ` +
                `(completed on a previous attempt)`
            );
          }
          renderSummaryTable(finalResults);
        } catch (e) {
          log.error('Failed to render summary table');
          log.error(e);
        }

        const hasFailedTests = (
          runResults: Array<
            | CypressCommandLine.CypressFailedRunResult
            | CypressCommandLine.CypressRunResult
            | undefined
          >
        ) =>
          _.some(
            runResults,
            (runResult) =>
              (runResult as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
              (runResult as CypressCommandLine.CypressRunResult)?.totalFailed
          );

        const hasFailedInitialTests = hasFailedTests(initialResults);
        const hasFailedRetryTests = hasFailedTests(retryResults);

        if (
          (hasFailedRetryTests && failedSpecFilePaths.length) ||
          (hasFailedInitialTests && !retryResults.length)
        ) {
          throw createFailError('Not all tests passed');
        }
      }
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
