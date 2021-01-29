/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('../../../test/api_integration/config.js')
  );
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testFiles: [require.resolve('./tests/anonymous')],
    servers: xPackAPITestsConfig.get('servers'),
    security: { disableTestUser: true },
    services: {
      ...kibanaAPITestsConfig.get('services'),
      ...xPackAPITestsConfig.get('services'),
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Anonymous with Username and Password)',
    },

    esTestCluster: { ...xPackAPITestsConfig.get('esTestCluster') },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--xpack.security.authc.selector.enabled=false`,
        `--xpack.security.authc.providers=${JSON.stringify({
          anonymous: {
            anonymous1: {
              order: 0,
              credentials: { username: 'anonymous_user', password: 'changeme' },
            },
          },
          basic: { basic1: { order: 1 } },
        })}`,
      ],
    },
  };
}
