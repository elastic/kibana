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
        // Overrides the `true` value set in the base config — last occurrence of a
        // repeated CLI arg wins, so this disables the setting for this suite only.
        '--uiSettings.overrides.securitySolution:enableRuleChangesHistory=false',
      ],
    },
    testFiles: [require.resolve('../change_tracking_disabled')],
    junit: {
      reportName:
        'Rules Management - Rule Management Integration Tests - ESS Env - Trial License - Rule Changes History Disabled',
    },
  };
}
