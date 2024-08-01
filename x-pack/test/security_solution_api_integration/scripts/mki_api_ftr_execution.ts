/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { exec } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import type {
  ProductType,
  ProjectHandler,
} from '@kbn/security-solution-plugin/scripts/run_cypress/project_handler/project_handler';
import { Environment } from '@kbn/security-solution-plugin/scripts/run_cypress/project_handler/project_handler';
import { CloudHandler } from '@kbn/security-solution-plugin/scripts/run_cypress/project_handler/cloud_project_handler';
import { ProxyHandler } from '@kbn/security-solution-plugin/scripts/run_cypress/project_handler/proxy_project_handler';
import {
  proxyHealthcheck,
  waitForEsStatusGreen,
  waitForKibanaAvailable,
  waitForEsAccess,
  getApiKeyFromElasticCloudJsonFile,
} from '@kbn/security-solution-plugin/scripts/run_cypress/parallel_serverless';

const BASE_ENV_URL = `${process.env.CONSOLE_URL}`;
const PROJECT_NAME_PREFIX = 'kibana-ftr-api-integration-security-solution';

// Function to execute a command and return a Promise with the status code
function executeCommand(
  command: string,
  envVars: any,
  log: ToolingLog,
  workDir?: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const childProcess = exec(command, { env: envVars }, (error, stdout, stderr) => {
      if (error) {
        log.error(`exec error: ${error}`);
        process.exitCode = error.code;
      }
    });

    // Listen and print stdout data
    childProcess.stdout?.on('data', (data) => {
      log.info(data);
    });

    // Listen and print stderr data
    childProcess.stderr?.on('data', (data) => {
      log.info(data);
    });

    // Listen for process exit
    childProcess.on('exit', (code) => {
      log.info(`Node process for target ${process.env.TARGET_SCRIPT} exits with code : ${code}`);
      if (code !== 0) {
        reject(code);
        return;
      }
      resolve(code);
    });
  });
}

async function parseProductTypes(log: ToolingLog): Promise<ProductType[] | undefined> {
  if (!process.env.TARGET_SCRIPT) {
    log.error('TARGET_SCRIPT environment variable is not provided. Aborting...');
    return process.exit(1);
  }

  const apiConfigs = JSON.parse(await fs.promises.readFile('./scripts/api_configs.json', 'utf8'));
  try {
    const productTypes: ProductType[] = apiConfigs[process.env.TARGET_SCRIPT]
      .productTypes as ProductType[];
    return productTypes && productTypes.length > 0 ? productTypes : undefined;
  } catch (err) {
    // If the configuration for the script is not needed, it can be omitted from the json file.
    log.warning(`Extended configuration was not found for script : ${process.env.TARGET_SCRIPT}`);
    return undefined;
  }
}

/**
 * Testing against MKI is only enabled for QA. So Environment (process.env.ENVIRONMENT) should only reflect to QA
 * environment anyway. There is only one scenario that would potentially require production so far which is testing
 * against the already deployed production image for multiple project regions (aws-eu-west "aws-us-west-2",
 * "aws-eu-west-1" and "aws-ap-southeast-1". The Production testing is not applicable to Quality Gates or any scheduled
 * pipeline execution or release process. It runs only on Demand, required by the Product Team. Also the functionality to
 * execute some tests against a production project is now introduced for future use.
 */
export const cli = () => {
  run(
    async (context) => {
      const log = new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      });
      const environment = process.env.ENVIRONMENT
        ? (process.env.ENVIRONMENT.toLowerCase() as Environment)
        : Environment.QA;

      const PROXY_URL = process.env.PROXY_URL ? process.env.PROXY_URL : undefined;
      const PROXY_SECRET = process.env.PROXY_SECRET ? process.env.PROXY_SECRET : undefined;
      const PROXY_CLIENT_ID = process.env.PROXY_CLIENT_ID ? process.env.PROXY_CLIENT_ID : undefined;

      const apiKeyFromCloudJsonFile = getApiKeyFromElasticCloudJsonFile(environment);
      // Checking if API key is either provided via env variable or in ~/.elastic.cloud.json
      // This works for either local executions or fallback in case proxy service is unavailable.
      if (!process.env.CLOUD_API_KEY && !apiKeyFromCloudJsonFile) {
        log.error(
          'The API key for the environment needs to be provided with the env var CLOUD_API_KEY.'
        );
        log.error(
          'If running locally, ~/.elastic/cloud.json is attempted to be read which contains the API key.'
        );

        return process.exit(1);
      }

      const API_KEY = process.env.CLOUD_API_KEY
        ? process.env.CLOUD_API_KEY
        : apiKeyFromCloudJsonFile;

      log.info(`PROXY_URL is defined : ${PROXY_URL !== undefined}`);
      log.info(`PROXY_CLIENT_ID is defined : ${PROXY_CLIENT_ID !== undefined}`);
      log.info(`PROXY_SECRET is defined : ${PROXY_SECRET !== undefined}`);
      log.info(`API_KEY is defined : ${API_KEY !== undefined}`);

      let cloudHandler: ProjectHandler;
      const proxyServiceUse =
        PROXY_URL &&
        PROXY_CLIENT_ID &&
        PROXY_SECRET &&
        environment !== Environment.Production &&
        (await proxyHealthcheck(PROXY_URL));

      if (proxyServiceUse) {
        log.info('Proxy service is up and running, so the tests will run using the proxyHandler.');
        cloudHandler = new ProxyHandler(PROXY_URL, PROXY_CLIENT_ID, PROXY_SECRET);
      } else if (API_KEY) {
        log.info(
          'Proxy service is unavailable or execution environment is prod, so the tests will run using the cloudHandler.'
        );
        cloudHandler = new CloudHandler(API_KEY, BASE_ENV_URL);
      } else {
        log.info('PROXY_URL or API KEY which are needed to create project could not be retrieved.');

        return process.exit(1);
      }

      const id = crypto.randomBytes(8).toString('hex');
      const PROJECT_NAME = `${PROJECT_NAME_PREFIX}-${id}`;
      const productTypes = await parseProductTypes(log);

      // Creating project for the test to run
      const project = await cloudHandler.createSecurityProject(PROJECT_NAME, productTypes);
      // Check if proxy service is used to define which org executes the tests.
      const proxyOrg = cloudHandler instanceof ProxyHandler ? project?.proxy_org_name : undefined;
      log.info(`Proxy Organization used id : ${proxyOrg}`);

      if (!project) {
        log.error('Failed to create project.');
        return process.exit(1);
      }
      let statusCode: number = 0;
      try {
        // Reset credentials for elastic user
        const credentials = await cloudHandler.resetCredentials(project.id, id);

        if (!credentials) {
          log.error('Credentials could not be reset.');

          return process.exit(1);
        }

        // Wait for project to be initialized
        await cloudHandler.waitForProjectInitialized(project.id);

        // Base64 encode the credentials in order to invoke ES and KB APIs
        const auth = btoa(`${credentials.username}:${credentials.password}`);

        // Wait for elasticsearch status to go green.
        await waitForEsStatusGreen(project.es_url, auth, id);

        // Wait until Kibana is available
        await waitForKibanaAvailable(project.kb_url, auth, id);

        // Wait for Elasticsearch to be accessible
        await waitForEsAccess(project.es_url, auth, id);

        const FORMATTED_ES_URL = project.es_url.replace('https://', '');
        const FORMATTED_KB_URL = project.kb_url.replace('https://', '');

        const command = `yarn run ${process.env.TARGET_SCRIPT}`;
        const testCloud = 1;
        const testEsUrl = `https://${credentials.username}:${credentials.password}@${FORMATTED_ES_URL}`;
        const testKibanaUrl = `https://${credentials.username}:${credentials.password}@${FORMATTED_KB_URL}`;
        const envVars = {
          ...process.env,
          TEST_CLOUD: testCloud.toString(),
          TEST_ES_URL: testEsUrl,
          TEST_KIBANA_URL: testKibanaUrl,
          TEST_CLOUD_HOST_NAME: new URL(BASE_ENV_URL).hostname,
          ROLES_FILENAME_OVERRIDE: proxyOrg ? `${proxyOrg}.json` : undefined,
        };

        statusCode = await executeCommand(command, envVars, log);
      } catch (err) {
        log.error('An error occured when running the test script.');
        log.error(err.message);
        statusCode = 1;
      } finally {
        // Delete serverless project
        log.info(`${id} : Deleting project ${PROJECT_NAME}...`);
        await cloudHandler.deleteSecurityProject(project.id, PROJECT_NAME);
      }
      process.exit(statusCode);
    },
    {
      flags: {
        allowUnexpected: true,
      },
    }
  );
};
