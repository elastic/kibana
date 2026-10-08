/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const edrWorkflowsConfig = await readConfigFile(require.resolve('./config.base.edr_workflows'));

  return {
    ...edrWorkflowsConfig.getAll(),
    kbnTestServer: {
      ...edrWorkflowsConfig.get('kbnTestServer'),
      serverArgs: [
        ...edrWorkflowsConfig.get('kbnTestServer.serverArgs'),

        `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ])}`,
      ],
    },
  };
}
