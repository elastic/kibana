/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { Config } from '@kbn/test';
import type { SUITE_TAGS } from '@kbn/test-suites-xpack-security-endpoint/configs/config.base';
import type { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import { installMockPrebuiltRulesPackage } from '../../test_suites/detections_response/utils';
import { SecuritySolutionEndpointRegistryHelpers } from '../services/common';

export const generateConfig = async ({
  baseConfig,
  junitReportName,
  kbnServerArgs = [],
  target,
  services,
}: {
  baseConfig: Config;
  junitReportName: string;
  kbnServerArgs?: string[];
  target: keyof typeof SUITE_TAGS;
  services: any;
}): Promise<Config> => {
  // services are not ready yet, so we need to import them here
  const { createEndpointDockerConfig, getRegistryUrlAsArray } =
    SecuritySolutionEndpointRegistryHelpers();
  return {
    ...baseConfig.getAll(),
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    dockerServers: createEndpointDockerConfig(),
    services,
    junit: {
      reportName: junitReportName,
    },
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        // if you return an empty string here the kibana server will not start properly but an empty array works
        ...getRegistryUrlAsArray(),
        // always install Endpoint package by default when Fleet sets up
        `--xpack.fleet.packages.0.name=endpoint`,
        `--xpack.fleet.packages.0.version=latest`,
        // set any experimental feature flags for testing
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([])}`,

        ...kbnServerArgs,
      ],
    },
    mochaOpts: {
      ...baseConfig.get('mochaOpts'),
      grep:
        target === 'serverless'
          ? '/^(?!.*(^|\\s)@skipInServerless(\\s|$)).*@serverless.*/'
          : '/^(?!.*@skipInEss).*@ess.*/',
      rootHooks: {
        // Creating an Endpoint package policy with endpointPolicyTestResources.createPolicy()
        // install prebuilt rules under the hood.
        // Prebuilt rules package installation has been known to be flakiness reason since
        // EPR might be unavailable or the network may have faults.
        // Real prebuilt rules package installation is prevented by
        // installing a lightweight mock package.
        beforeAll: ({ getService }: FtrProviderContext) =>
          installMockPrebuiltRulesPackage({ getService }),
      },
    },
  };
};
