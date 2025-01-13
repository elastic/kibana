/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiIntegrationConfig = await readConfigFile(
    require.resolve('../../../api_integration/config.ts')
  );

  return {
    testFiles: [require.resolve('./apis')],
    servers: apiIntegrationConfig.get('servers'),
    services,
    junit: {
      reportName: 'X-Pack Saved Object Tagging API Integration Tests',
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
      ],
    },
  };
}
