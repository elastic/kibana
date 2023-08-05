/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';

import { services } from '../services';
import type { CreateTestConfigOptions } from '../types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlBaseConfig = await readConfigFile(require.resolve('../config.base.ts'));

    return {
      ...svlBaseConfig.getAll(),

      services: {
        ...services,
        ...options.services,
      },
      kbnTestServer: {
        ...svlBaseConfig.get('kbnTestServer'),
        serverArgs: [...svlBaseConfig.get('kbnTestServer.serverArgs'), `--serverless=es`],
      },
      testFiles: options.testFiles,
      junit: options.junit,
      suiteTags: options.suiteTags,
    };
  };
}
