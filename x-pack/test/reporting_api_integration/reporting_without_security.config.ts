/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esTestConfig, kbnTestConfig } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { format as formatUrl } from 'url';
import { ReportingAPIProvider } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config'));

  return {
    servers: apiConfig.get('servers'),
    junit: { reportName: 'X-Pack Reporting Without Security API Integration Tests' },
    testFiles: [require.resolve('./reporting_without_security')],
    services: {
      ...apiConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
    },
    esArchiver: apiConfig.get('esArchiver'),
    esTestCluster: {
      ...apiConfig.get('esTestCluster'),
      serverArgs: [
        ...apiConfig.get('esTestCluster.serverArgs'),
        'node.name=UnsecuredClusterNode01',
        'xpack.security.enabled=false',
      ],
    },
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [
        `--elasticsearch.hosts=${formatUrl(esTestConfig.getUrlParts())}`,
        `--logging.json=false`,
        `--server.maxPayloadBytes=1679958`,
        `--server.port=${kbnTestConfig.getPort()}`,
        `--xpack.reporting.capture.maxAttempts=1`,
        `--xpack.reporting.csv.maxSizeBytes=2850`,
        `--xpack.security.enabled=false`,
      ],
    },
  };
}
