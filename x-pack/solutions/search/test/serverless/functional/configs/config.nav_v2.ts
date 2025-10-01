/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...baseConfig.getAll(),
    junit: {
      reportName: 'Serverless Search Functional Tests - v2 Solution Navigation',
    },
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--feature_flags.overrides.core.chrome.projectSideNav=v2',
        `--uiSettings.overrides.agentBuilder:enabled=true`,
      ],
    },
    testFiles: [require.resolve('../test_suites/navigation')],
  };
}
