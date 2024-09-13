/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';

import { TransportResult } from '@elastic/elasticsearch';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { tiAbusechMalware } from './pipelines/ti_abusech_malware';
import { tiAbusechMalwareBazaar } from './pipelines/ti_abusech_malware_bazaar';
import { tiAbusechUrl } from './pipelines/ti_abusech_url';

export type { FtrProviderContext } from '../common/ftr_provider_context';

export async function SecuritySolutionConfigurableCypressTestRunner({
  getService,
}: FtrProviderContext) {
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
    BASE_URL: Url.format(config.get('servers.kibana')),
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
  };
}
