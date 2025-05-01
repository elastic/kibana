/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));

  return {
    ...baseFleetApiConfig.getAll(),
    testFiles: [require.resolve('./apis/epm')],
    junit: {
      reportName: 'X-Pack EPM API Integration Tests',
    },

    kbnTestServer: {
      ...baseFleetApiConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseFleetApiConfig.get('kbnTestServer.serverArgs'),
        // this will be removed in 9.2 when security AI prompts feature is GA
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'securityAIPromptsEnabled',
        ])}`,
      ],
    },
  };
}
