/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

/**
 * Make sure to create a MKI deployment with custom Kibana image, that includes feature flags arguments
 * These tests most likely will fail on default MKI project
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...baseConfig.getAll(),
    junit: {
      reportName: 'Serverless Search Feature Flags Functional Tests',
    },
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--feature_flags.overrides.core.chrome.projectSideNav=v2',
        `--uiSettings.overrides.agentBuilder:enabled=true`,
        `--uiSettings.overrides.searchPlayground:searchModeEnabled=true`,
      ],
    },
    // load tests in the index file
    testFiles: [require.resolve('./index.feature_flags.ts')],
    apps: {
      ...baseConfig.get('apps'),
    },
  };
}
