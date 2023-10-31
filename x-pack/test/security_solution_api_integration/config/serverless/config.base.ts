/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
export interface CreateTestConfigOptions {
  testFiles: string[];
  junit: { reportName: string };
}

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(
      require.resolve('../../../../test_serverless/shared/config.base.ts')
    );

    return {
      ...svlSharedConfig.getAll(),
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [...svlSharedConfig.get('kbnTestServer.serverArgs'), '--serverless=security'],
      },
      testFiles: options.testFiles,
      junit: options.junit,

      mochaOpts: {
        ...svlSharedConfig.get('mochaOpts'),
        grep: '/^(?!.*@brokenInServerless).*@serverless.*/',
      },
    };
  };
}
