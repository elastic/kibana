/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import type { ExperimentalFeatures } from '@kbn/security-solution-plugin/common';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.edr_workflows.trial')
  );

  const enabledExperimentalFeatures: Array<keyof ExperimentalFeatures> = [
    'responseActionsScriptLibraryManagement',
  ];

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'EDR Workflows - Policy Response Integration Tests - ESS Env - Trial License',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        // SECURITY SOLUTION: set any experimental feature flags for testing
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(
          enabledExperimentalFeatures
        )}`,
      ],
    },
  };
}
