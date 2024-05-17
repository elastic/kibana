/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from '../../../api_integration/services';

export interface CreateTestConfigOptions {
  testFiles: string[];
  junit: { reportName: string };
  publicBaseUrl?: boolean;
}

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackApiIntegrationTestsConfig = await readConfigFile(
      require.resolve('../../../api_integration/config.ts')
    );

    const svlSharedConfig = await readConfigFile(
      require.resolve('../../../../test_serverless/shared/config.base.ts')
    );
    const svlSharedServices = svlSharedConfig.get('services');

    return {
      ...xPackApiIntegrationTestsConfig.getAll(),
      testFiles: options.testFiles,
      services: {
        ...services,
        sloApi: svlSharedServices.sloApi,
        alertingApi: svlSharedServices.alertingApi,
      },
      junit: {
        reportName: 'X-Pack Οbservability Solution API Integration Tests',
      },
      mochaOpts: {
        grep: '/^(?!.*@skipInEss).*@ess.*/',
      },
      kbnTestServer: {
        ...xPackApiIntegrationTestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
          ...(options.publicBaseUrl ? ['--server.publicBaseUrl=http://localhost:5620'] : []),
        ],
      },
    };
  };
}
