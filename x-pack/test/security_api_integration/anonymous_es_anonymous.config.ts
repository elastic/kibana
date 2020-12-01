/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const anonymousAPITestsConfig = await readConfigFile(require.resolve('./anonymous.config.ts'));
  return {
    ...anonymousAPITestsConfig.getAll(),

    junit: {
      reportName: 'X-Pack Security API Integration Tests (Anonymous with ES anonymous access)',
    },

    esTestCluster: {
      ...anonymousAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...anonymousAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.anonymous.username=anonymous_user',
        'xpack.security.authc.anonymous.roles=anonymous_role',
      ],
    },

    kbnTestServer: {
      ...anonymousAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...anonymousAPITestsConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.startsWith('--xpack.security.authc.providers')),
        `--xpack.security.authc.providers=${JSON.stringify({
          anonymous: { anonymous1: { order: 0, credentials: 'elasticsearch_anonymous_user' } },
          basic: { basic1: { order: 1 } },
        })}`,
      ],
    },
  };
}
