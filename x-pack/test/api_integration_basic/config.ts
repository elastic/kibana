/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackApiIntegrationConfig = await readConfigFile(
    require.resolve('../api_integration/config.ts')
  );

  return {
    // default to the xpack api integration config
    ...xpackApiIntegrationConfig.getAll(),
    esTestCluster: {
      ...xpackApiIntegrationConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: [
        'xpack.license.self_generated.type=basic',
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
      ],
    },
    testFiles: [require.resolve('./apis')],
    junit: {
      ...xpackApiIntegrationConfig.get('junit'),
      reportName: 'X-Pack API Integration Tests Basic License',
    },
  };
}
