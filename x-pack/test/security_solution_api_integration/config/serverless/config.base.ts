/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  FtrConfigProviderContext,
  GenericFtrProviderContext,
  kbnTestConfig,
  kibanaTestSuperuserServerless,
} from '@kbn/test';

import { services } from '../../../../test_serverless/api_integration/services';

// Tests type for now
export type InheritedFtrProviderContext = GenericFtrProviderContext<typeof services, {}>;

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

export interface CreateTestConfigOptions {
  serverlessProject: 'es' | 'oblt' | 'security';
  esServerArgs?: string[];
  kbnServerArgs?: string[];
  testFiles: string[];
  junit: { reportName: string };
  suiteTags?: { include?: string[]; exclude?: string[] };
  services?: InheritedServices;
}

export function createTestConfig(options: Partial<CreateTestConfigOptions>) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(
      require.resolve('../../../../test_serverless/shared/config.base.ts')
    );

    return {
      ...svlSharedConfig.getAll(),

      services: {
        ...services,
        ...options.services,
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),

        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          '--serverless=security',
          ...(options.kbnServerArgs || []),
        ],
        env: {
          ...svlSharedConfig.get('kbnTestServer').env,
          ELASTICSEARCH_USERNAME: kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).username,
        },
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
