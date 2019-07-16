/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../types/providers';

// eslint-disable-next-line import/no-default-export
export default async function({ readConfigFile }: KibanaFunctionalTestDefaultProviders) {
  const kerberosAPITestsConfig = await readConfigFile(require.resolve('./config.ts'));

  return {
    ...kerberosAPITestsConfig.getAll(),

    junit: {
      reportName: 'X-Pack Kerberos API with Anonymous Access Integration Tests',
    },

    esTestCluster: {
      ...kerberosAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...kerberosAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.anonymous.username=anonymous_user',
        'xpack.security.authc.anonymous.roles=superuser',
      ],
    },
  };
}
