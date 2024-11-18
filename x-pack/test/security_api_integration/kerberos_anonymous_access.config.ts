/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kerberosAPITestsConfig = await readConfigFile(require.resolve('./kerberos.config.ts'));

  return {
    ...kerberosAPITestsConfig.getAll(),

    junit: {
      reportName: 'X-Pack Security API Integration Tests (Kerberos with Anonymous Access)',
    },

    esTestCluster: {
      ...kerberosAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...kerberosAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.anonymous.username=anonymous_user',
        'xpack.security.authc.anonymous.roles=superuser_anonymous',
      ],
    },
  };
}
