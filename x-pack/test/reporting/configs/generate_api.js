/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esTestConfig, kbnTestConfig, kibanaServerTestUser } from '@kbn/test';
import { format as formatUrl } from 'url';
import { ReportingAPIProvider } from '../services';

export default async function({ readConfigFile }) {
  const apiConfig = await readConfigFile(require.resolve('../../api_integration/config.js'));

  return {
    servers: apiConfig.get('servers'),
    junit: { reportName: 'X-Pack Reporting Generate API Integration Tests' },
    testFiles: [require.resolve('../api/generate')],
    services: {
      ...apiConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
    },
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [
        '--logging.events.log',
        '["info","warning","error","fatal","optimize","reporting"]',
        `--elasticsearch.hosts=${formatUrl(esTestConfig.getUrlParts())}`,
        `--elasticsearch.password=${kibanaServerTestUser.password}`,
        `--elasticsearch.username=${kibanaServerTestUser.username}`,
        `--logging.json=false`,
        `--optimize.enabled=false`,
        `--server.maxPayloadBytes=1679958`,
        `--server.port=${kbnTestConfig.getPort()}`,
        `--xpack.reporting.csv.enablePanelActionDownload=true`,
        `--xpack.reporting.csv.maxSizeBytes=2850`,
        `--xpack.reporting.queue.pollInterval=3000`,
        `--xpack.spaces.enabled=false`,
      ],
    },
    esArchiver: apiConfig.get('esArchiver'),
    esTestCluster: apiConfig.get('esTestCluster'),
  };
}
