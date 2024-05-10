/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from '../../../api_integration/services';

export function createTestConfig(options) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackApiIntegrationTestsConfig = await readConfigFile(
      require.resolve('../../../api_integration/config.ts')
    );

    return {
      ...xPackApiIntegrationTestsConfig.getAll(),
      testFiles: options.testFiles,
      services,
      junit: {
        reportName: 'X-Pack Οbservability Solution API Integration Tests',
      },
      mochaOpts: {
        grep: '/^(?!.*@skipInEss).*@ess.*/',
      },
    };
  };
}
