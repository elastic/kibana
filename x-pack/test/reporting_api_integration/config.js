/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esTestConfig, kbnTestConfig, kibanaServerTestUser } from '@kbn/test';
import { format as formatUrl } from 'url';
import { ReportingAPIProvider } from './services';

export default async function ({ readConfigFile }) {
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config')); // Reporting API tests need a fully working UI

  return {
    servers: apiConfig.get('servers'),
    junit: { reportName: 'X-Pack Reporting API Integration Tests' },
    testFiles: [require.resolve('./reporting')],
    services: {
      ...apiConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
    },
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),

        `--elasticsearch.hosts=${formatUrl(esTestConfig.getUrlParts())}`,
        `--elasticsearch.password=${kibanaServerTestUser.password}`,
        `--elasticsearch.username=${kibanaServerTestUser.username}`,
        `--logging.json=false`,
        `--server.maxPayloadBytes=1679958`,
        `--server.port=${kbnTestConfig.getPort()}`,
        `--xpack.reporting.capture.maxAttempts=1`,
        `--xpack.reporting.csv.maxSizeBytes=2850`,
        `--xpack.reporting.queue.pollInterval=3000`,
        `--xpack.security.session.idleTimeout=3600000`,
        `--xpack.spaces.enabled=false`,
      ],
    },
    esArchiver: apiConfig.get('esArchiver'),
    esTestCluster: apiConfig.get('esTestCluster'),
  };
}
