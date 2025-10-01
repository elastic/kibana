/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

import { pageObjects } from '../page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const searchFuncationalConfig = await readConfigFile(require.resolve('../config'));

  return {
    ...searchFuncationalConfig.getAll(),
    pageObjects,
    junit: {
      reportName: 'Search Solution UI Functional Tests w/ Feature Flagged Features',
    },
    kbnTestServer: {
      ...searchFuncationalConfig.get('kbnTestServer'),
      serverArgs: [
        ...searchFuncationalConfig.get('kbnTestServer.serverArgs'),
        '--xpack.spaces.defaultSolution=es', // Default to Search Solution
        `--uiSettings.overrides.searchPlayground:searchModeEnabled=true`,
        `--uiSettings.overrides.agentBuilder:enabled=true`,
      ],
    },
    // load tests in the index file
    testFiles: [require.resolve('../index.feature_flags.ts')],
  };
}
