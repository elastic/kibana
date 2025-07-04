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
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import cypress from 'cypress';
import grep from '@cypress/grep/src/plugin';
import crypto from 'crypto';
import fs from 'fs';
import { exec } from 'child_process';
import { createFailError } from '@kbn/dev-cli-errors';
import axios, { AxiosError } from 'axios';
import path from 'path';
import os from 'os';
import pRetry from 'p-retry';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { catchAxiosErrorFormatAndThrow } from '../../common/endpoint/format_axios_error';
import { createToolingLogger } from '../../common/endpoint/data_loaders/utils';
import { renderSummaryTable } from './print_run';
import {
  getOnBeforeHook,
  parseTestFileConfig,
  retrieveIntegrations,
  setDefaultToolingLoggingLevel,
} from './utils';
import { prefixedOutputLogger } from '../endpoint/common/utils';

import type { ProductType, Credentials, ProjectHandler } from './project_handler/project_handler';
import { CloudHandler } from './project_handler/cloud_project_handler';
import { ProxyHandler } from './project_handler/proxy_project_handler';

const DEFAULT_CONFIGURATION: Readonly<ProductType[]> = [
  { product_line: 'security', product_tier: 'complete' },
  { product_line: 'cloud', product_tier: 'complete' },
  { product_line: 'endpoint', product_tier: 'complete' },
] as const;

const PROJECT_NAME_PREFIX = 'kibana-cypress-security-solution-ephemeral';
const BASE_ENV_URL = `${process.env.QA_CONSOLE_URL}`;
let log: ToolingLog = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress-creds',
  'x-elastic-internal-origin': 'security-solution',
  [ELASTIC_HTTP_VERSION_HEADER]: [INITIAL_REST_VERSION],
});
const PROVIDERS = Object.freeze({
  providerType: 'basic',
  providerName: 'cloud-basic',
});

const getApiKeyFromElasticCloudJsonFile = (): string | undefined => {
  const userHomeDir = os.homedir();
  try {
    const jsonString = fs.readFileSync(path.join(userHomeDir, '.elastic/cloud.json'), 'utf-8');
    const jsonData = JSON.parse(jsonString);
    return jsonData.api_key.qa;
  } catch (e) {
    log.info('API KEY could not be found in .elastic/cloud.json');
  }
};

// Check if proxy service is up and running executing a healthcheck call.
export function proxyHealthcheck(proxyUrl: string): Promise<boolean> {
  const fetchHealthcheck = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if Elasticsearch is green.`);

    const response = await axios.get(`${proxyUrl}/healthcheck`);
    log.info(`The proxy service is available.`);
    return response.status === 200;
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError) {
        log.info(`The proxy service is not available. A retry will be triggered soon...`);
      }
    },
    retries: 4,
    factor: 2,
    maxTimeout: 20000,
  };

  return pRetry(fetchHealthcheck, retryOptions);
}

// Wait until elasticsearch status goes green
export function waitForEsStatusGreen(
  esUrl: string,
  auth: string,
  projectId: string
): Promise<void> {
  const fetchHealthStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if Elasticsearch is green.`);

    const response = await axios
      .get(`${esUrl}/_cluster/health?wait_for_status=green&timeout=50s`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
      .catch(catchAxiosErrorFormatAndThrow);

    log.info(`${projectId}: Elasticsearch is ready with status ${response.data.status}.`);
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info(
          `${projectId}: The Elasticsearch URL is not yet reachable. A retry will be triggered soon...`
        );
      }
    },
    retries: 50,
    factor: 2,
    maxTimeout: 20000,
  };

  return pRetry(fetchHealthStatusAttempt, retryOptions);
}

// Wait until Kibana is available
export function waitForKibanaAvailable(
  kbUrl: string,
  auth: string,
  projectId: string
): Promise<void> {
  const fetchKibanaStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if kibana is available.`);
    const response = await axios
      .get(`${kbUrl}/api/status`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
      .catch(catchAxiosErrorFormatAndThrow);
    if (response.data.status.overall.level !== 'available') {
      throw new Error(`${projectId}: Kibana is not available. A retry will be triggered soon...`);
    } else {
      log.info(`${projectId}: Kibana status overall is ${response.data.status.overall.level}.`);
    }
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info(
          `${projectId}: The Kibana URL is not yet reachable. A retry will be triggered soon...`
        );
      } else {
        log.info(`${projectId}: ${error.message}`);
      }
    },
    retries: 50,
    factor: 2,
    maxTimeout: 20000,
  };
  return pRetry(fetchKibanaStatusAttempt, retryOptions);
}

// Wait for Elasticsearch to be accessible
export function waitForEsAccess(esUrl: string, auth: string, projectId: string): Promise<void> {
  const fetchEsAccessAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if can be accessed.`);

    await axios
      .get(`${esUrl}`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
      .catch(catchAxiosErrorFormatAndThrow);
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info(
          `${projectId}: The elasticsearch url is not yet reachable. A retry will be triggered soon...`
        );
      }
    },
    retries: 100,
    factor: 2,
    maxTimeout: 20000,
  };

  return pRetry(fetchEsAccessAttempt, retryOptions);
}

// Wait until application is ready
function waitForKibanaLogin(kbUrl: string, credentials: Credentials): Promise<void> {
  const body = {
    ...PROVIDERS,
    currentURL: '/',
    params: credentials,
  };

  const fetchLoginStatusAttempt = async (attemptNum: number) => {
    log.info(`Retry number ${attemptNum} to check if login can be performed.`);
    axios
      .post(`${kbUrl}/internal/security/login`, body, {
        headers: API_HEADERS,
      })
      .catch(catchAxiosErrorFormatAndThrow);
  };
  const retryOptions = {
    onFailedAttempt: (error: Error | AxiosError) => {
      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        log.info('Project is not reachable. A retry will be triggered soon...');
      } else {
        log.error(`${error.message}`);
      }
    },
    retries: 100,
    factor: 2,
    maxTimeout: 20000,
  };
  return pRetry(fetchLoginStatusAttempt, retryOptions);
}

const getProductTypes = (
  tier: string,
  endpointAddon: boolean,
  cloudAddon: boolean
): ProductType[] => {
  let productTypes: ProductType[] = [...DEFAULT_CONFIGURATION];

  if (tier) {
    productTypes = productTypes.map((product) => ({
      ...product,
      product_tier: tier,
    }));
  }
  if (!cloudAddon) {
    productTypes = productTypes.filter((product) => product.product_line !== 'cloud');
  }
  if (!endpointAddon) {
    productTypes = productTypes.filter((product) => product.product_line !== 'endpoint');
  }

  return productTypes;
};

export const cli = () => {
  run(
    async (context) => {
      // Checking if API key is either provided via env variable or in ~/.elastic.cloud.json
      // This works for either local executions or fallback in case proxy service is unavailable.
      if (!process.env.CLOUD_QA_API_KEY && !getApiKeyFromElasticCloudJsonFile()) {
        log.error('The API key for the environment needs to be provided with the env var API_KEY.');
        log.error(
          'If running locally, ~/.elastic/cloud.json is attempted to be read which contains the API key.'
        );
        // eslint-disable-next-line no-process-exit
        return process.exit(1);
      }

      const PROXY_URL = process.env.PROXY_URL ? process.env.PROXY_URL : undefined;
      const PROXY_SECRET = process.env.PROXY_SECRET ? process.env.PROXY_SECRET : undefined;
      const PROXY_CLIENT_ID = process.env.PROXY_CLIENT_ID ? process.env.PROXY_CLIENT_ID : undefined;
      const USE_CHROME_BETA = process.env.USE_CHROME_BETA?.match(/(1|true)/i);

      const API_KEY = process.env.CLOUD_QA_API_KEY
        ? process.env.CLOUD_QA_API_KEY
        : getApiKeyFromElasticCloudJsonFile();

      log.info(`PROXY_URL is defined : ${PROXY_URL !== undefined}`);
      log.info(`PROXY_CLIENT_ID is defined : ${PROXY_CLIENT_ID !== undefined}`);
      log.info(`PROXY_SECRET is defined : ${PROXY_SECRET !== undefined}`);
      log.info(`API_KEY is defined : ${API_KEY !== undefined}`);
      log.info(`USE_CHROME_BETA is defined : ${USE_CHROME_BETA !== undefined}`);

      let cloudHandler: ProjectHandler;
      if (PROXY_URL && PROXY_CLIENT_ID && PROXY_SECRET && (await proxyHealthcheck(PROXY_URL))) {
        log.info('Proxy service is up and running, so the tests will run using the proxyHandler.');
        cloudHandler = new ProxyHandler(PROXY_URL, PROXY_CLIENT_ID, PROXY_SECRET);
      } else if (API_KEY) {
        log.info('Proxy service is unavailable, so the tests will run using the cloudHandler.');
        cloudHandler = new CloudHandler(API_KEY, BASE_ENV_URL);
      } else {
        log.info('PROXY_URL or API KEY which are needed to create project could not be retrieved.');
        // eslint-disable-next-line no-process-exit
        return process.exit(1);
      }

      const PARALLEL_COUNT = process.env.PARALLEL_COUNT ? Number(process.env.PARALLEL_COUNT) : 1;

      if (!process.env.CLOUD_ENV) {
        log.warning(
          'The cloud environment to be provided with the env var CLOUD_ENV. Currently working only for QA so the script can proceed.'
        );
        // Abort when more environments will be integrated
        // return process.exit(0);
      }

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
        .option('tier', {
          alias: 't',
          type: 'string',
          default: 'complete',
        })
        .option('endpointAddon', {
          alias: 'ea',
          type: 'boolean',
          default: true,
        })
        .option('cloudAddon', {
          alias: 'ca',
          type: 'boolean',
          default: true,
        })
        .option('commit', {
          alias: 'c',
          type: 'string',
          default: '',
        })
        .option('onBeforeHook', {
          // Execute a hook before running the tests with cypress.open/run
          alias: 'b',
          type: 'string',
          default: '',
        });

      log.info(`
----------------------------------------------
Script arguments:
----------------------------------------------

${JSON.stringify(argv, null, 2)}

----------------------------------------------
`);

      const isOpen = argv._.includes('open');
      const cypressConfigFilePath = require.resolve(`../../../../${argv.configFile}`) as string;
      const cypressConfigFile = await import(cypressConfigFilePath);

      // if KIBANA_MKI_QUALITY_GATE exists and has a value, we are running the tests against the Kibana QA quality gate.
      if (process.env.KIBANA_MKI_QUALITY_GATE) {
        log.info(
          'KIBANA_MKI_QUALITY_GATE is provided, so @serverlessQA --@skipInServerless --@skipInServerlessMKI tags will run.'
        );
        cypressConfigFile.env.grepTags = '@serverlessQA --@skipInServerless --@skipInServerlessMKI';
      }

      setDefaultToolingLoggingLevel(cypressConfigFile?.env?.TOOLING_LOG_LEVEL);

      // eslint-disable-next-line require-atomic-updates
      log = prefixedOutputLogger('cy.parallel(svl)', createToolingLogger());

      const tier: string = argv.tier;
      const endpointAddon: boolean = argv.endpointAddon;
      const cloudAddon: boolean = argv.cloudAddon;
      const commit: string = argv.commit;

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

      log.info('Config spec pattern:', specConfig);
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
        : globby.sync(specPattern); // convert the glob pattern to concrete file paths

      const files = retrieveIntegrations(concreteFilePaths);

      log.info('Resolved spec files after retrieveIntegrations:', files);

      if (!files?.length) {
        log.info('No tests found');
        // eslint-disable-next-line no-process-exit
        return process.exit(0);
      }

      const failedSpecFilePaths: string[] = [];

      const runSpecs = (filePaths: string[]) =>
        pMap(
          filePaths,
          async (filePath) => {
            let result:
              | CypressCommandLine.CypressRunResult
              | CypressCommandLine.CypressFailedRunResult
              | undefined;
            await withProcRunner(log, async (procs) => {
              const id = crypto.randomBytes(8).toString('hex');
              const PROJECT_NAME = `${PROJECT_NAME_PREFIX}-${id}`;

              const productTypes = isOpen
                ? getProductTypes(tier, endpointAddon, cloudAddon)
                : (parseTestFileConfig(filePath).productTypes as ProductType[]);

              log.info(`Running spec file: ${filePath}`);
              log.info(`Creating project ${PROJECT_NAME}...`);
              // Creating project for the test to run
              const project = await cloudHandler.createSecurityProject(
                PROJECT_NAME,
                productTypes,
                commit
              );

              if (!project) {
                log.error('Failed to create project.');
                // eslint-disable-next-line no-process-exit
                return process.exit(1);
              }

              log.info(`
                -----------------------------------------------
                 Project created with details:
                -----------------------------------------------
                 ID: ${project.id}
                 Name: ${project.name}
                 Region: ${project.region}
                 Elasticsearch URL: ${project.es_url}
                 Kibana URL: ${project.kb_url}
                 Product: ${project.product}
                 Organization ID: ${project.proxy_org_id}
                 Organization Name: ${project.proxy_org_name}
                -----------------------------------------------
               `);

              context.addCleanupTask(() => {
                let command: string;
                if (cloudHandler instanceof CloudHandler) {
                  command = `curl -X DELETE ${BASE_ENV_URL}/api/v1/serverless/projects/security/${project.id} -H "Authorization: ApiKey ${API_KEY}"`;
                  exec(command);
                } else if (cloudHandler instanceof ProxyHandler) {
                  const proxyAuth = btoa(`${PROXY_CLIENT_ID}:${PROXY_SECRET}`);
                  command = `curl -X DELETE ${PROXY_URL}/projects/${project.id} -H "Authorization: Basic ${proxyAuth}"`;
                  exec(command);
                }
              });

              // Reset credentials for elastic user
              const credentials = await cloudHandler.resetCredentials(project.id);

              if (!credentials) {
                log.error('Credentials could not be reset.');
                // eslint-disable-next-line no-process-exit
                return process.exit(1);
              }

              // Wait for project to be initialized
              await cloudHandler.waitForProjectInitialized(project.id);

              // Base64 encode the credentials in order to invoke ES and KB APIs
              const auth = btoa(`${credentials.username}:${credentials.password}`);

              // Wait for elasticsearch status to go green.
              await waitForEsStatusGreen(project.es_url, auth, project.id);

              // Wait until Kibana is available
              await waitForKibanaAvailable(project.kb_url, auth, project.id);

              // Wait for Elasticsearch to be accessible
              await waitForEsAccess(project.es_url, auth, project.id);

              // Wait until application is ready
              await waitForKibanaLogin(project.kb_url, credentials);

              // Check if proxy service is used to define which org executes the tests.
              const proxyOrg =
                cloudHandler instanceof ProxyHandler ? project.proxy_org_name : undefined;

              // Normalized the set of available env vars in cypress
              const cyCustomEnv = {
                BASE_URL: project.kb_url,

                ELASTICSEARCH_URL: project.es_url,
                ELASTICSEARCH_USERNAME: credentials.username,
                ELASTICSEARCH_PASSWORD: credentials.password,

                // Used in order to handle the correct role_users file loading.
                PROXY_ORG: proxyOrg,

                KIBANA_URL: project.kb_url,
                KIBANA_USERNAME: credentials.username,
                KIBANA_PASSWORD: credentials.password,

                // Both CLOUD_SERVERLESS and IS_SERVERLESS are used by the cypress tests.
                CLOUD_SERVERLESS: true,
                IS_SERVERLESS: true,
                CLOUD_QA_API_KEY: API_KEY,
                // TEST_CLOUD is used by SvlUserManagerProvider to define if testing against cloud.
                TEST_CLOUD: 1,
              };

              if (process.env.DEBUG && !process.env.CI) {
                log.info(`
              ----------------------------------------------
              Cypress run ENV for file: ${filePath}:
              ----------------------------------------------
              ${JSON.stringify(cyCustomEnv, null, 2)}
              ----------------------------------------------
              `);
              }
              process.env.TEST_CLOUD_HOST_NAME = new URL(BASE_ENV_URL).hostname;

              // If provided, execute the onBeforeHook directly before running the tests once everything is set up
              if (argv.onBeforeHook) {
                const onBeforeFilePath = require.resolve(`../../${argv.onBeforeHook}`) as string;
                const module: unknown = await import(onBeforeFilePath);
                const onBeforeHook = getOnBeforeHook(module, onBeforeFilePath);

                await onBeforeHook(cyCustomEnv);
              }

              if (isOpen) {
                await cypress.open({
                  configFile: cypressConfigFilePath,
                  config: {
                    e2e: {
                      baseUrl: project.kb_url,
                    },
                    env: cyCustomEnv,
                  },
                });
              } else {
                try {
                  result = await cypress.run({
                    browser: USE_CHROME_BETA ? 'chrome:beta' : 'chrome',
                    spec: filePath,
                    configFile: cypressConfigFilePath,
                    reporter: argv.reporter as string,
                    reporterOptions: argv.reporterOptions,
                    headed: argv.headed as boolean,
                    config: {
                      e2e: {
                        baseUrl: project.kb_url,
                      },
                      numTestsKeptInMemory: 0,
                      env: cyCustomEnv,
                    },
                    runnerUi: !process.env.CI,
                  });
                  if ((result as CypressCommandLine.CypressRunResult)?.totalFailed) {
                    failedSpecFilePaths.push(filePath);
                  }
                  // Delete serverless project
                  log.info(`Deleting project ${PROJECT_NAME} and ID ${project.id} ...`);
                  await cloudHandler.deleteSecurityProject(project.id, PROJECT_NAME);
                } catch (error) {
                  // False positive
                  // eslint-disable-next-line require-atomic-updates
                  result = error;
                  failedSpecFilePaths.push(filePath);
                  log.error(`Cypress runner failed: ${error}`);
                }
              }
              return result;
            });
            return result;
          },
          {
            concurrency: PARALLEL_COUNT,
          }
        );

      const initialResults = await runSpecs(files);
      // If there are failed tests, retry them
      const retryResults = await runSpecs([...failedSpecFilePaths]);

      renderSummaryTable([
        // Don't include failed specs from initial run in results
        ..._.filter(
          initialResults,
          (initialResult: CypressCommandLine.CypressRunResult) =>
            initialResult?.runs &&
            _.some(
              initialResult?.runs,
              (runResult) => !failedSpecFilePaths.includes(runResult.spec.absolute)
            )
        ),
        ...retryResults,
      ] as CypressCommandLine.CypressRunResult[]);
      const hasFailedTests = (
        runResults: Array<
          | CypressCommandLine.CypressFailedRunResult
          | CypressCommandLine.CypressRunResult
          | undefined
        >
      ) =>
        _.some(
          // only fail the job if retry failed as well
          runResults,
          (runResult) =>
            (runResult as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
            (runResult as CypressCommandLine.CypressRunResult)?.totalFailed
        );

      const hasFailedInitialTests = hasFailedTests(initialResults);
      const hasFailedRetryTests = hasFailedTests(retryResults);

      // If the initialResults had failures and failedSpecFilePaths was not populated properly return errors
      if (hasFailedRetryTests || (hasFailedInitialTests && !retryResults.length)) {
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
