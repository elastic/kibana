/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { resolve } from 'path';
import globby from 'globby';

import Url from 'url';

import { withProcRunner } from '@kbn/dev-proc-runner';

import semver from 'semver';
import { FtrProviderContext } from './ftr_provider_context';

const retrieveIntegrations = (chunksTotal: number, chunkIndex: number) => {
  const pattern = resolve(__dirname, '../../plugins/security_solution/cypress/e2e/**/*.cy.ts');
  const integrationsPaths = globby.sync(pattern);
  const chunkSize = Math.ceil(integrationsPaths.length / chunksTotal);

  return chunk(integrationsPaths, chunkSize)[chunkIndex - 1];
};

export async function SecuritySolutionConfigurableCypressTestRunner(
  { getService }: FtrProviderContext,
  command: string,
  envVars?: Record<string, string>
) {
  const log = getService('log');
  const config = getService('config');
  const esArchiver = getService('esArchiver');

  await esArchiver.load('x-pack/test/security_solution_cypress/es_archives/auditbeat');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: [command],
      cwd: resolve(__dirname, '../../plugins/security_solution'),
      env: {
        FORCE_COLOR: '1',
        CYPRESS_BASE_URL: Url.format(config.get('servers.kibana')),
        CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
        CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
        CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
        ...process.env,
        ...envVars,
      },
      wait: true,
    });
  });
}

/**
 * Takes total CI jobs number(totalCiJobs) between which tests will be split and sequential number of the job(ciJobNumber).
 * This helper will split file list cypress integrations into chunks, and run integrations in chunk which match ciJobNumber
 * If both totalCiJobs === 1 && ciJobNumber === 1, this function will run all existing tests, without splitting them
 * @param context FtrProviderContext
 * @param {number} totalCiJobs - total number of jobs between which tests will be split
 * @param {number} ciJobNumber - number of job
 * @returns
 */
export async function SecuritySolutionCypressCliTestRunnerCI(
  context: FtrProviderContext,
  totalCiJobs: number,
  ciJobNumber: number
) {
  const integrations = retrieveIntegrations(totalCiJobs, ciJobNumber);
  return SecuritySolutionConfigurableCypressTestRunner(context, 'cypress:run:spec', {
    SPEC_LIST: integrations.join(','),
  });
}

export async function SecuritySolutionCypressCliResponseOpsTestRunner(context: FtrProviderContext) {
  return SecuritySolutionConfigurableCypressTestRunner(context, 'cypress:run:respops');
}

export async function SecuritySolutionCypressCliCasesTestRunner(context: FtrProviderContext) {
  return SecuritySolutionConfigurableCypressTestRunner(context, 'cypress:run:cases');
}

export async function SecuritySolutionCypressCliTestRunner(context: FtrProviderContext) {
  return SecuritySolutionConfigurableCypressTestRunner(context, 'cypress:run');
}

export async function SecuritySolutionCypressCliFirefoxTestRunner(context: FtrProviderContext) {
  return SecuritySolutionConfigurableCypressTestRunner(context, 'cypress:run:firefox');
}

export async function SecuritySolutionCypressVisualTestRunner(context: FtrProviderContext) {
  return SecuritySolutionConfigurableCypressTestRunner(context, 'cypress:open');
}

export async function SecuritySolutionCypressCcsTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: ['cypress:run:ccs'],
      cwd: resolve(__dirname, '../../plugins/security_solution'),
      env: {
        FORCE_COLOR: '1',
        CYPRESS_BASE_URL: process.env.TEST_KIBANA_URL,
        CYPRESS_ELASTICSEARCH_URL: process.env.TEST_ES_URL,
        CYPRESS_ELASTICSEARCH_USERNAME: process.env.ELASTICSEARCH_USERNAME,
        CYPRESS_ELASTICSEARCH_PASSWORD: process.env.ELASTICSEARCH_PASSWORD,
        CYPRESS_CCS_KIBANA_URL: process.env.TEST_KIBANA_URLDATA,
        CYPRESS_CCS_ELASTICSEARCH_URL: process.env.TEST_ES_URLDATA,
        CYPRESS_CCS_REMOTE_NAME: process.env.TEST_CCS_REMOTE_NAME,
        ...process.env,
      },
      wait: true,
    });
  });
}

export async function SecuritySolutionCypressUpgradeCliTestRunner({
  getService,
}: FtrProviderContext) {
  const log = getService('log');
  let command = '';

  if (semver.gt(process.env.ORIGINAL_VERSION!, '7.10.0')) {
    command = 'cypress:run:upgrade';
  } else {
    command = 'cypress:run:upgrade:old';
  }

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: [command],
      cwd: resolve(__dirname, '../../plugins/security_solution'),
      env: {
        FORCE_COLOR: '1',
        CYPRESS_BASE_URL: process.env.TEST_KIBANA_URL,
        CYPRESS_ELASTICSEARCH_URL: process.env.TEST_ES_URL,
        CYPRESS_ELASTICSEARCH_USERNAME: process.env.TEST_ES_USER,
        CYPRESS_ELASTICSEARCH_PASSWORD: process.env.TEST_ES_PASS,
        CYPRESS_ORIGINAL_VERSION: process.env.ORIGINAL_VERSION,
        ...process.env,
      },
      wait: true,
    });
  });
}
