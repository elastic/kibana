/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext, Config } from '@kbn/test';

import { ServerlessProjectType } from '@kbn/es';
import { services } from './services';

interface CreateTestConfigOptions {
  serverlessProject: ServerlessProjectType;
  esServerArgs?: string[];
  kbnServerArgs?: string[];
  testFiles: string[];
  junit: { reportName: string };
  suiteTags?: { include?: string[]; exclude?: string[] };
}

export function createServerlessTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext): Promise<Config> => {
    const svlSharedConfig = await readConfigFile(
      require.resolve('../../../test_serverless/shared/config.base.ts')
    );

    return {
      ...svlSharedConfig.getAll(),

      services: {
        ...services,
      },
      esTestCluster: {
        ...svlSharedConfig.get('esTestCluster'),
        serverArgs: [
          ...svlSharedConfig.get('esTestCluster.serverArgs'),
          ...(options.esServerArgs ?? []),
        ],
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          `--serverless=${options.serverlessProject}`,
          ...(options.kbnServerArgs || []),
        ],
      },
      testFiles: options.testFiles,
      junit: options.junit,
      suiteTags: options.suiteTags,
    };
  };
}
