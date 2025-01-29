/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import Url from 'url';
import type { FtrProviderContext } from '../common/ftr_provider_context';
import { loadProfilingData } from './load_profiling_data';
import { setupProfilingResources } from './setup_profiling_resources';

const DEFAULT_HEADERS = {
  'kbn-xsrf': true,
  'x-elastic-internal-origin': 'Kibana',
};

export async function cypressTestRunner({ getService }: FtrProviderContext) {
  const config = getService('config');

  const username = config.get('servers.elasticsearch.username');
  const password = config.get('servers.elasticsearch.password');

  const esNode = Url.format({
    protocol: config.get('servers.elasticsearch.protocol'),
    port: config.get('servers.elasticsearch.port'),
    hostname: config.get('servers.elasticsearch.hostname'),
    auth: `${username}:${password}`,
  });

  const esRequestTimeout = config.get('timeouts.esRequestTimeout');

  const kibanaUrlWithAuth = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
    auth: `${username}:${password}`,
  });

  // Ensure Fleet setup is complete
  await axios.post(`${kibanaUrlWithAuth}/api/fleet/setup`, {}, { headers: DEFAULT_HEADERS });

  const profilingResources = await axios.get<{ has_setup: boolean; has_data: boolean }>(
    `${kibanaUrlWithAuth}/internal/profiling/setup/es_resources`,
    { headers: DEFAULT_HEADERS }
  );

  // Only runs the setup once. This is useful when running the tests with --times args
  if (!profilingResources.data.has_setup) {
    await setupProfilingResources({ kibanaUrlWithAuth });
  }

  // Only loads profiling data once. This is useful when running the tests with --times args
  if (!profilingResources.data.has_data) {
    await loadProfilingData({ esNode, esRequestTimeout });
  }

  const kibanaUrlWithoutAuth = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
  });

  return {
    KIBANA_URL: kibanaUrlWithoutAuth,
    ES_NODE: esNode,
    ES_REQUEST_TIMEOUT: esRequestTimeout,
    TEST_CLOUD: process.env.TEST_CLOUD,
    baseUrl: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    configport: config.get('servers.kibana.port'),
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.kibana.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.kibana.password'),
  };
}
