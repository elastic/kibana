/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { OsqueryCypressServerlessTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const osqueryCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  const config = osqueryCypressConfig.getAll();

  return {
    ...config,
    esTestCluster: {
      ...config.esTestCluster,
      serverArgs: [
        ...config.esTestCluster.serverArgs,
        'indices.write_ack_delay_interval=500ms',
        'indices.write_ack_delay_randomness_bound=100ms',
        'node._internal.default_refresh_interval=5s',
      ],
    },
    testRunner: OsqueryCypressServerlessTestRunner,
  };
}
