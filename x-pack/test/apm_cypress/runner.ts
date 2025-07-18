/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogger, LogLevel, SynthtraceClientsManager } from '@kbn/apm-synthtrace';
import Url from 'url';
import { createApmUsers } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/create_apm_users';
import { createEsClientForFtrConfig } from '@kbn/test';
import type { FtrProviderContext } from '../common/ftr_provider_context';

export async function cypressTestRunner({ getService }: FtrProviderContext) {
  const config = getService('config');
  const es = createEsClientForFtrConfig(config);

  const username = config.get('servers.elasticsearch.username');
  const password = config.get('servers.elasticsearch.password');

  const kibanaUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
    auth: `${username}:${password}`,
  });

  const esNode = Url.format({
    protocol: config.get('servers.elasticsearch.protocol'),
    port: config.get('servers.elasticsearch.port'),
    hostname: config.get('servers.elasticsearch.hostname'),
    auth: `${username}:${password}`,
  });

  // Creates APM users
  await createApmUsers({
    elasticsearch: { node: esNode, username, password },
    kibana: { hostname: kibanaUrl },
  });

  const esRequestTimeout = config.get('timeouts.esRequestTimeout');

  const clientsManager = new SynthtraceClientsManager({
    client: es,
    logger: createLogger(LogLevel.info),
  });

  const { apmEsClient } = clientsManager.getClients({
    clients: ['apmEsClient'],
    kibana: {
      target: kibanaUrl,
      logger: createLogger(LogLevel.info),
    },
  });

  const packageVersion = await clientsManager.initFleetPackageForClient({
    clients: {
      apmEsClient,
    },
    skipInstallation: false,
  });

  const kibanaUrlWithoutAuth = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.kibana.port'),
  });

  return {
    KIBANA_URL: kibanaUrlWithoutAuth,
    APM_PACKAGE_VERSION: packageVersion.apmEsClient,
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
