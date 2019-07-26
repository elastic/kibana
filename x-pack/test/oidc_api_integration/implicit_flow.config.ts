/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../types/providers';

// eslint-disable-next-line import/no-default-export
export default async function({ readConfigFile }: KibanaFunctionalTestDefaultProviders) {
  const oidcAPITestsConfig = await readConfigFile(require.resolve('./config.ts'));

  return {
    ...oidcAPITestsConfig.getAll(),
    testFiles: [require.resolve('./apis/implicit_flow')],

    junit: {
      reportName: 'X-Pack OpenID Connect API Integration Tests (Implicit Flow)',
    },

    esTestCluster: {
      ...oidcAPITestsConfig.get('esTestCluster'),
      serverArgs: oidcAPITestsConfig.get('esTestCluster.serverArgs').map((arg: string) => {
        if (arg.startsWith('xpack.security.authc.realms.oidc.oidc1.rp.response_type')) {
          return 'xpack.security.authc.realms.oidc.oidc1.rp.response_type=id_token token';
        }

        if (arg.startsWith('xpack.security.authc.realms.oidc.oidc1.op.token_endpoint')) {
          return 'xpack.security.authc.realms.oidc.oidc1.op.token_endpoint=should_not_be_used';
        }

        return arg;
      }),
    },
  };
}
