/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const oidcAPITestsConfig = await readConfigFile(require.resolve('./config.ts'));

  return {
    ...oidcAPITestsConfig.getAll(),
    testFiles: [require.resolve('./apis/implicit_flow')],

    junit: {
      reportName: 'X-Pack OpenID Connect API Integration Tests (Implicit Flow)',
    },

    esTestCluster: {
      ...oidcAPITestsConfig.get('esTestCluster'),
      serverArgs: oidcAPITestsConfig
        .get('esTestCluster.serverArgs')
        .reduce((serverArgs: string[], arg: string) => {
          // We should change `response_type` to `id_token token` and get rid of unnecessary `token_endpoint`.
          if (arg.startsWith('xpack.security.authc.realms.oidc.oidc1.rp.response_type')) {
            serverArgs.push(
              'xpack.security.authc.realms.oidc.oidc1.rp.response_type=id_token token'
            );
          } else if (!arg.startsWith('xpack.security.authc.realms.oidc.oidc1.op.token_endpoint')) {
            serverArgs.push(arg);
          }

          return serverArgs;
        }, []),
    },
  };
}
