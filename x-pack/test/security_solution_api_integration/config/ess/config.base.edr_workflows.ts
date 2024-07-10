/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Config } from '@kbn/test';
import { SUITE_TAGS } from '../../test_suites/security_solution_endpoint/configs/config.base';
import {
  createEndpointDockerConfig,
  getRegistryUrlAsArray,
} from '../../../common/services/security_solution';

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
  return {
    ...baseConfig.getAll(),
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
        // this will be removed in 8.7 when the file upload feature is released
        `--xpack.fleet.enableExperimental.0=diagnosticFileUploadEnabled`,
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
    },
  };
};
