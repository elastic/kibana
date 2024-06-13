/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.trial')
  );

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([])}`,
      ],
    },
    testFiles: [require.resolve('../ess/trial')],
    junit: {
      reportName: 'Timeline Integration Tests - ESS Env - Trial License',
    },
  };
}
