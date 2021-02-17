/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esTestConfig, kbnTestConfig } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { format as formatUrl } from 'url';
import { pageObjects } from '../functional/page_objects'; // Reporting APIs depend on UI functionality
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiConfig = await readConfigFile(require.resolve('../api_integration/config'));

  return {
    apps: { reporting: { pathname: '/app/management/insightsAndAlerting/reporting' } },
    servers: apiConfig.get('servers'),
    junit: { reportName: 'X-Pack Reporting Without Security API Integration Tests' },
    testFiles: [require.resolve('./reporting_without_security')],
    services,
    pageObjects,
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
