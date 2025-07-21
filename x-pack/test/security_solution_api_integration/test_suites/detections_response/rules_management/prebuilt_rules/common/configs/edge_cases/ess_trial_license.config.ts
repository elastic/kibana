/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../../../config/ess/config.base.trial')
  );

  const testConfig = {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('../../prebuilt_rules_package/install_package_from_epr')],
    junit: {
      reportName:
        'Rules Management - Prebuilt Rules (Common) Integration Tests - ESS Trial License',
    },
    mochaOpts: {
      ...functionalConfig.get('mochaOpts'),
      timeout: 60000 * 10, // 10 minutes
    },
  };

  return testConfig;
}
