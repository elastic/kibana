/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.base.js'));

  return {
    ...baseIntegrationTestsConfig.getAll(),
    testFiles: [
      require.resolve('../../../../test_all_deployments/functional/test_suites/common'),
      require.resolve('../../../../test_all_deployments/functional/test_suites/observability'),
      require.resolve('../../../../test_all_deployments/functional/test_suites/search'),
      require.resolve('../../../../test_all_deployments/functional/test_suites/security'),
    ],
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests - all deployments tests',
    },
  };
}
