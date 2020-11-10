/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testFiles: [require.resolve('./tests/token')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services: {
      legacyEs: xPackAPITestsConfig.get('services.legacyEs'),
      supertestWithoutAuth: xPackAPITestsConfig.get('services.supertestWithoutAuth'),
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Token)',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.security.authc.providers=["token"]',
      ],
    },
  };
}
