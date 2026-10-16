/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../configs/ess/rules_management.trial.config')
  );

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        // Headroom over the default 10MB; large compact imports are a few MB.
        '--xpack.securitySolution.maxRuleImportPayloadBytes=20971520',
      ],
    },
    testFiles: [require.resolve('../import_rules_large_payload')],
    mochaOpts: {
      ...functionalConfig.get('mochaOpts'),
      timeout: 60 * 60 * 1000, // 60 minutes
    },
    junit: {
      reportName:
        'Rules Management - Rule Import Large Payload Integration Tests - ESS Env - Trial License',
    },
  };
}
