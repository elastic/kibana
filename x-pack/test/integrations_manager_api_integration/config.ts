/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));

  return {
    testFiles: [require.resolve('./apis')],
    servers: xPackAPITestsConfig.get('servers'),
    services: {
      supertest: xPackAPITestsConfig.get('services.supertest'),
    },
    junit: {
      reportName: 'X-Pack Integrations Manager API Integration Tests',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.integrationsManager.registryUrl=http://localhost:6666',
      ],
    },
  };
}
