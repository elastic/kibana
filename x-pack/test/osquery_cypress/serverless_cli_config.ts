/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { SERVERLESS_NODES } from '@kbn/es';
import { startOsqueryCypress } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const securitySolutionCypressConfig = await readConfigFile(
    require.resolve(
      '@kbn/test-suites-serverless/functional/test_suites/security/cypress/security_config.base'
    )
  );

  return {
    ...securitySolutionCypressConfig.getAll(),

    esTestCluster: {
      ...securitySolutionCypressConfig.get('esTestCluster'),
      serverArgs: [
        ...securitySolutionCypressConfig.get('esTestCluster.serverArgs'),
        'http.host=0.0.0.0',
      ],
    },

    kbnTestServer: {
      ...securitySolutionCypressConfig.get('kbnTestServer'),
      serverArgs: [
        ...securitySolutionCypressConfig.get('kbnTestServer.serverArgs'),
        `--xpack.fleet.agents.fleet_server.hosts=["https://host.docker.internal:8220"]`,
        `--xpack.fleet.agents.elasticsearch.host=http://${
          SERVERLESS_NODES[0].name
        }:${securitySolutionCypressConfig.get('servers.elasticsearch.port')}`,
        `--xpack.fleet.packages.0.name=osquery_manager`,
        `--xpack.fleet.packages.0.version=latest`,
      ],
    },

    testRunner: startOsqueryCypress,
  };
}
