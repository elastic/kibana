/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../../configs/ess/rules_management.trial.config')
  );

  const testConfig = {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('../index_2')],
    junit: {
      reportName:
        'Rules Management - Prebuilt Rule Type Specific Fields (Customization Enabled) Part 2 - ESS Env',
    },
  };

  return testConfig;
}
