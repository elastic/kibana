/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import type { ExperimentalFeatures as SecuritySolutionExperimentalFeatures } from '@kbn/security-solution-plugin/common';

/** This is a TEMPORARY config file created to perform Endpoint Exceptions related API tests with
 * the feature flag `endpointArtifactsExportImportEnabled` enabled.
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.edr_workflows.trial')
  );
  const securitySolutionEnableExperimental: Array<keyof SecuritySolutionExperimentalFeatures> = [
    'trustedAppsAdvancedMode',
    'filterProcessDescendantsForTrustedAppsEnabled',
    'trustedDevices',
    'endpointArtifactsExportImportEnabled',
  ];

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('../artifact_import.ts')],
    junit: {
      reportName: 'EDR Workflows - Artifact Import Integration Tests - ESS Env - Trial License',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs').filter(
          // Exclude Security solution experimental features
          // properties since we are overriding them here
          (arg: string) => !arg.includes('xpack.securitySolution.enableExperimental')
        ),
        // SECURITY SOLUTION: set any experimental feature flags for testing
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(
          securitySolutionEnableExperimental
        )}`,
      ],
    },
  };
}
