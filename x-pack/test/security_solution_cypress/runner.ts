/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';

import { FtrProviderContext } from '../common/ftr_provider_context';

export type { FtrProviderContext } from '../common/ftr_provider_context';

export async function SecuritySolutionConfigurableCypressTestRunner({
  getService,
}: FtrProviderContext) {
  const config = getService('config');
  const esArchiver = getService('esArchiver');

  await esArchiver.load('x-pack/test/security_solution_cypress/es_archives/auditbeat');

  return {
    FORCE_COLOR: '1',
    CYPRESS_BASE_URL: Url.format(config.get('servers.kibana')),
    CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
    CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
    baseUrl: Url.format(config.get('servers.kibana')),
    BASE_URL: Url.format(config.get('servers.kibana')),
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
  };
}
