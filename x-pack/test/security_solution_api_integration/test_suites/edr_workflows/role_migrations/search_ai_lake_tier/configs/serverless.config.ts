/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/serverless/config.base.edr_workflows')
  );

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),

        `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
          { product_line: 'ai_soc', product_tier: 'search_ai_lake' },
        ])}`,
      ],
    },
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'EDR Workflows API - Role Migration Tests - Serverless Env - search AI lake tier',
    },
  };
}
