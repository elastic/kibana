/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';

import type { CreateTestConfigOptions } from '../types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const obltConfig = await readConfigFile(require.resolve('./oblt.config.ts'));

    return {
      ...obltConfig.getAll(),

      services: {
        ...obltConfig.get('services'),
        ...options.services,
      },
      kbnTestServer: {
        ...obltConfig.get('kbnTestServer'),
        serverArgs: [
          ...obltConfig.get('kbnTestServer.serverArgs'),
          '--xpack.observability.unsafe.thresholdRule.enabled=true',
        ],
      },
      testFiles: options.testFiles,
      junit: options.junit,
      suiteTags: options.suiteTags,
    };
  };
}
