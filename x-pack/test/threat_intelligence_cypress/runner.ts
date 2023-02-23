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
import { TransportResult } from '@elastic/elasticsearch';
import { FtrProviderContext } from './ftr_provider_context';

import { tiAbusechMalware } from './pipelines/ti_abusech_malware';
import { tiAbusechMalwareBazaar } from './pipelines/ti_abusech_malware_bazaar';
import { tiAbusechUrl } from './pipelines/ti_abusech_url';

const retrieveIntegrations = (chunksTotal: number, chunkIndex: number) => {
  const pattern = resolve(__dirname, '../../plugins/threat_intelligence/cypress/e2e/**/*.cy.ts');
  const integrationsPaths = globby.sync(pattern);
  const chunkSize = Math.ceil(integrationsPaths.length / chunksTotal);

  return chunk(integrationsPaths, chunkSize)[chunkIndex - 1] || [];
};

export async function ThreatIntelligenceConfigurableCypressTestRunner(
  { getService }: FtrProviderContext,
  command: string,
  envVars?: Record<string, string>
) {
  const log = getService('log');
  const config = getService('config');
  const es = getService('es');

  const pipelines = [tiAbusechMalware, tiAbusechMalwareBazaar, tiAbusechUrl];

  log.info('configure pipelines');

  for (const pipeline of pipelines) {
    const res: TransportResult<unknown, any> = await es.transport.request({
      method: 'PUT',
      path: `_ingest/pipeline/${pipeline.name}`,
      body: {
        processors: pipeline.processors,
        on_failure: pipeline.on_failure,
      },
    });

    log.info(`PUT pipeline ${pipeline.name}: ${res.statusCode}`);
  }

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: [command],
      cwd: resolve(__dirname, '../../plugins/threat_intelligence'),
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

export async function ThreatIntelligenceCypressCliTestRunnerCI(
  context: FtrProviderContext,
  totalCiJobs: number,
  ciJobNumber: number
) {
  const integrations = retrieveIntegrations(totalCiJobs, ciJobNumber);
  return ThreatIntelligenceConfigurableCypressTestRunner(context, 'cypress:run:spec', {
    SPEC_LIST: integrations.join(','),
  });
}

export async function ThreatIntelligenceCypressCliResponseOpsTestRunner(
  context: FtrProviderContext
) {
  return ThreatIntelligenceConfigurableCypressTestRunner(context, 'cypress:run:respops');
}

export async function ThreatIntelligenceCypressCliCasesTestRunner(context: FtrProviderContext) {
  return ThreatIntelligenceConfigurableCypressTestRunner(context, 'cypress:run:cases');
}

export async function ThreatIntelligenceCypressCliTestRunner(context: FtrProviderContext) {
  return ThreatIntelligenceConfigurableCypressTestRunner(context, 'cypress:run');
}

export async function ThreatIntelligenceCypressCliFirefoxTestRunner(context: FtrProviderContext) {
  return ThreatIntelligenceConfigurableCypressTestRunner(context, 'cypress:run:firefox');
}

export async function ThreatIntelligenceCypressVisualTestRunner(context: FtrProviderContext) {
  return ThreatIntelligenceConfigurableCypressTestRunner(context, 'cypress:open');
}

export async function ThreatIntelligenceCypressCcsTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: ['cypress:run:ccs'],
      cwd: resolve(__dirname, '../../plugins/threat_intelligence'),
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

export async function ThreatIntelligenceCypressUpgradeCliTestRunner({
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
      cwd: resolve(__dirname, '../../plugins/threat_intelligence'),
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
