/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiIntegrationConfig = await readConfigFile(
    require.resolve('../api_integration/config.ts')
  );

  return {
    testFiles: [require.resolve('./security_and_spaces/apis')],
    servers: apiIntegrationConfig.get('servers'),
    services,
    junit: {
      reportName:
        'X-Pack Saved Object Access Control API Integration Tests - Security and Spaces integration',
    },
    esTestCluster: {
      ...apiIntegrationConfig.get('esTestCluster'),
      license: 'trial',
    },
    kbnTestServer: {
      ...apiIntegrationConfig.get('kbnTestServer'),
      serverArgs: [
        ...apiIntegrationConfig.get('kbnTestServer.serverArgs'),
        '--server.xsrf.disableProtection=true',
        `--plugin-path=${path.resolve(__dirname, 'fixtures', 'confidential_plugin')}`,
      ],
    },
  };
}
