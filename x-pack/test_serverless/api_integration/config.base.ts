/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { resolve } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';
import type { CreateTestConfigOptions } from '../shared/types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(require.resolve('../shared/config.base.ts'));
    const svlBaseConfig = resolve(REPO_ROOT, 'config', 'serverless.yml');

    return {
      ...svlSharedConfig.getAll(),

      services,
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          options.serverlessProject
            ? `--serverless=${options.serverlessProject}`
            : `--config=${svlBaseConfig}`,
        ],
      },
      testFiles: options.testFiles,
    };
  };
}
