/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { join, resolve } from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { SLACK_ACTION_SIMULATOR_URI } from './fixtures/plugins/actions';

export async function getApiIntegrationConfig({ readConfigFile }) {
  const xPackApiIntegrationTestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));

  const servers = {
    ...xPackApiIntegrationTestsConfig.get('servers'),
    elasticsearch: {
      ...xPackApiIntegrationTestsConfig.get('servers.elasticsearch'),
      protocol: 'https',
    },
  };

  return {
    testFiles: [require.resolve('./apis')],
    services: xPackApiIntegrationTestsConfig.get('services'),
    servers,
    esArchiver: {
      directory: resolve(__dirname, 'es_archives'),
    },
    junit: {
      reportName: 'X-Pack Alerting API Integration Tests',
    },
    kbnTestServer: {
      ...xPackApiIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${join(__dirname, 'fixtures', 'plugins', 'alerts')}`,
        `--plugin-path=${join(__dirname, 'fixtures', 'plugins', 'actions')}`,
        `--server.xsrf.whitelist=${JSON.stringify([SLACK_ACTION_SIMULATOR_URI])}`,
        `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
      ],
    },
    esTestCluster: {
      ...xPackApiIntegrationTestsConfig.get('esTestCluster'),
      ssl: true,
    },
  };
}

export default getApiIntegrationConfig;
