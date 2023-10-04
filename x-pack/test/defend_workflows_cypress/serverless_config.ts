/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLocalhostRealIp } from '@kbn/security-solution-plugin/scripts/endpoint/common/network_services';
import { FtrConfigProviderContext } from '@kbn/test';

import { ExperimentalFeatures } from '@kbn/security-solution-plugin/common/experimental_features';
import { ES_RESOURCES } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/serverless';
import { DefendWorkflowsCypressCliTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const defendWorkflowsCypressConfig = await readConfigFile(
    require.resolve(
      '../../test_serverless/functional/test_suites/security/cypress/security_config.base.ts'
    )
  );
  const config = defendWorkflowsCypressConfig.getAll();
  const hostIp = getLocalhostRealIp();

  const enabledFeatureFlags: Array<keyof ExperimentalFeatures> = [];

  return {
    ...config,

    esTestCluster: {
      ...config.esTestCluster,
      serverArgs: [...config.esTestCluster.serverArgs, 'http.host=0.0.0.0'],
    },
    esServerlessOptions: {
      ...(config.esServerlessOptions ?? {}),
      resources: Object.values(ES_RESOURCES),
    },
    servers: {
      ...config.servers,
      fleetserver: {
        protocol: 'https',
        hostname: hostIp,
        port: 8220,
      },
    },

    kbnTestServer: {
      ...config.kbnTestServer,
      serverArgs: [
        ...config.kbnTestServer.serverArgs,
        `--xpack.fleet.agents.fleet_server.hosts=["https://${hostIp}:8220"]`,
        `--xpack.fleet.agents.elasticsearch.host=http://${hostIp}:${defendWorkflowsCypressConfig.get(
          'servers.elasticsearch.port'
        )}`,
        // set the packagerTaskInterval to 5s in order to speed up test executions when checking fleet artifacts
        '--xpack.securitySolution.packagerTaskInterval=5s',
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(enabledFeatureFlags)}`,
      ],
    },
    testRunner: DefendWorkflowsCypressCliTestRunner,
  };
}
