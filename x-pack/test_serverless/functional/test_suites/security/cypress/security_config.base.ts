/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const svlSharedConfig = await readConfigFile(
    require.resolve('../../../../shared/config.base.ts')
  );

  return {
    ...svlSharedConfig.getAll(),
    esTestCluster: {
      ...svlSharedConfig.get('esTestCluster'),
      serverArgs: [
        ...svlSharedConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
        // API Keys is enabled at the top level
      ],
    },
    kbnTestServer: {
      ...svlSharedConfig.get('kbnTestServer'),
      serverArgs: [
        ...svlSharedConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        '--serverless=security',
      ],
    },
  };
}
