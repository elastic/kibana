/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import type { CreateTestConfigOptions } from '../shared_types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xpackApiIntegrationTestsConfig = await readConfigFile(
      // eslint-disable-next-line @kbn/imports/no_boundary_crossing
      require.resolve('../../test/api_integration/config.ts')
    );

    return {
      services,
      servers: xpackApiIntegrationTestsConfig.get('servers'),
      uiSettings: xpackApiIntegrationTestsConfig.get('uiSettings'),
      kbnTestServer: {
        ...xpackApiIntegrationTestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xpackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
          `--serverless${options.serverlessProject ? `=${options.serverlessProject}` : ''}`,
        ],
      },
      esTestCluster: {
        ...xpackApiIntegrationTestsConfig.get('esTestCluster'),
        serverArgs: ['xpack.security.enabled=false'],
      },
      testFiles: options.testFiles,
    };
  };
}
