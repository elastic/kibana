/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../../config/ess/config.base.basic')
  );

  const testConfig = {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('..')],
    junit: {
      reportName:
        'Rules Management - Prebuilt Rules (ML Disabled) - Integration Tests - ESS Env Basic License',
    },
  };

  return testConfig;
}

// TODO: REMOVE THIS COMMENT
