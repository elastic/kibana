/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import Url from 'url';

import { withProcRunner } from '@kbn/dev-proc-runner';

import semver from 'semver';
import { TransportResult } from '@elastic/elasticsearch';
import { FtrProviderContext } from './ftr_provider_context';

import { tiAbusechMalware } from './pipelines/ti_abusech_malware';
import { tiAbusechMalwareBazaar } from './pipelines/ti_abusech_malware_bazaar';
import { tiAbusechUrl } from './pipelines/ti_abusech_url';

export async function ThreatIntelligenceConfigurableCypressTestRunner(
  { getService }: FtrProviderContext,
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

  return {
    FORCE_COLOR: '1',
    CYPRESS_BASE_URL: Url.format(config.get('servers.kibana')),
    CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
    CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
    ...envVars,
    baseUrl: Url.format(config.get('servers.kibana')),
    BASE_URL: Url.format(config.get('servers.kibana')),
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
  };
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
