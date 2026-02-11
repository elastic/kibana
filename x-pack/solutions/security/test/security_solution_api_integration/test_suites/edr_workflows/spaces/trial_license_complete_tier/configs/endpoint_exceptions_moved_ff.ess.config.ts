/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import type { ExperimentalFeatures as SecuritySolutionExperimentalFeatures } from '@kbn/security-solution-plugin/common';
import type { ExperimentalFeatures as FleetExperimentalFeatures } from '@kbn/fleet-plugin/common/experimental_features';

/** This is a TEMPORARY config file created to perform Endpoint Exceptions related API tests with
 * the feature flag `endpointExceptionsMovedUnderManagement` enabled.
 *
 * Once Endpoint Exceptions are fully moved under management and the feature flag is removed,
 * this config file should be deleted.
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.edr_workflows.trial')
  );

  const securitySolutionEnableExperimental: Array<keyof SecuritySolutionExperimentalFeatures> = [
    'endpointExceptionsMovedUnderManagement',
  ];
  const fleetEnableExperimental: Partial<FleetExperimentalFeatures> = {
    useSpaceAwareness: true,
  };

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('..')],
    junit: {
      reportName:
        'EDR Workflows - Space Awareness Integration Tests with Endpoint Exceptions - ESS Env - Trial License',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs').filter(
          // Exclude Fleet and Security solution experimental features
          // properties since we are overriding them here
          (arg: string) =>
            !arg.includes('xpack.fleet.experimentalFeatures') &&
            !arg.includes('xpack.securitySolution.enableExperimental')
        ),
        // FLEET: set any experimental feature flags for testing
        `--xpack.fleet.experimentalFeatures=${JSON.stringify(fleetEnableExperimental)}`,

        // SECURITY SOLUTION: set any experimental feature flags for testing
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(
          securitySolutionEnableExperimental
        )}`,
      ],
    },
  };
}
