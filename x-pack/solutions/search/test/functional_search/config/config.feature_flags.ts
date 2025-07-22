/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { pageObjects } from '../page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
<<<<<<<< HEAD:x-pack/solutions/search/test/functional_feature_flags/config/config.feature_flags.ts
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/functional/config.base')
  );
========
  const searchFuncationalConfig = await readConfigFile(require.resolve('../config'));
>>>>>>>> upstream/main:x-pack/solutions/search/test/functional_search/config/config.feature_flags.ts

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
      ],
    },
    // load tests in the index file
    testFiles: [require.resolve('../index.feature_flags.ts')],
  };
}
