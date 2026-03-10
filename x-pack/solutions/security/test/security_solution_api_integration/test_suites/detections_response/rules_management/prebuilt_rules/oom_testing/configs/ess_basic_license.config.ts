/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../configs/ess/rules_management.basic.config')
  );

  const parentConfig = functionalConfig.getAll();

  const testConfig = {
    ...parentConfig,
    testFiles: [require.resolve('..')],
    mochaOpts: {
      ...parentConfig.mochaOpts,
      // Fleet doesn't have [Spacetime][Fleet] Introduce airgapped config for bundled packages
      // https://github.com/elastic/kibana/pull/202435 backported to 8.19. It blocks package
      // removal when it's unable to find it in the registry.
      //
      // Fixing this issue by skipping global hooks installing the prebuilt rules package.
      rootHooks: {},
    },
    junit: {
      reportName: 'Rules Management - Prebuilt Rules OOM Testing - ESS Basic License',
    },
  };

  return testConfig;
}
