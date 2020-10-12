/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
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
      reportName:
        'X-Pack Saved Object Tagging API Integration Tests - Security and Spaces integration',
    },
    esArchiver: {
      directory: path.resolve(__dirname, '..', '..', 'common', 'fixtures', 'es_archiver'),
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
