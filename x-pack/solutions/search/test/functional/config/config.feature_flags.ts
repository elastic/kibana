/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack/functional/config.base')
  );

  return {
    ...xpackFunctionalConfig.getAll(),
    junit: {
      reportName: 'Search Solution UI Functional Tests w/ Feature Flagged Features',
    },
    esTestCluster: {
      ...xpackFunctionalConfig.get('esTestCluster'),
      serverArgs: [
        ...xpackFunctionalConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enabled=true',
      ],
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        '--xpack.spaces.defaultSolution=es', // Default to Search Solution
        `--uiSettings.overrides.searchPlayground:searchModeEnabled=true`,
      ],
    },
    // load tests in the index file
    testFiles: [require.resolve('../index.feature_flags.ts')],
  };
}
