/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import type { ExperimentalFeatures as SecuritySolutionExperimentalFeatures } from '@kbn/security-solution-plugin/common';
import type { ExperimentalFeatures as FleetExperimentalFeatures } from '@kbn/fleet-plugin/common/experimental_features';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/serverless/config.base.edr_workflows')
  );

  const securitySolutionEnableExperimental: Array<keyof SecuritySolutionExperimentalFeatures> = [
    'endpointManagementSpaceAwarenessEnabled',
  ];
  const fleetEnableExperimental: Array<keyof FleetExperimentalFeatures> = ['useSpaceAwareness'];

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'EDR Workflows - Space Awareness Integration Tests - Serverless Env - Complete',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs').filter(
          // Exclude Fleet and Security solution experimental features
          // properties since we are overriding them here
          (arg: string) =>
            !arg.includes('xpack.fleet.enableExperimental') &&
            !arg.includes('xpack.securitySolution.enableExperimental')
        ),
        // FLEET: set any experimental feature flags for testing
        `--xpack.fleet.enableExperimental=${JSON.stringify(fleetEnableExperimental)}`,

        // SECURITY SOLUTION: set any experimental feature flags for testing
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(
          securitySolutionEnableExperimental
        )}`,

        // Enable spaces UI capabilities
        '--xpack.spaces.maxSpaces=100',
      ],
    },
  };
}
