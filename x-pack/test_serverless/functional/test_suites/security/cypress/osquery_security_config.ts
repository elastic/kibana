/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { startOsqueryCypress } from '../../../../../test/osquery_cypress/runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const securitySolutionCypressConfig = await readConfigFile(
    require.resolve('./security_config.base.ts')
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
        `--xpack.fleet.agents.elasticsearch.host=http://host.docker.internal:${securitySolutionCypressConfig.get(
          'servers.elasticsearch.port'
        )}`,
        `--xpack.fleet.packages.0.name=osquery_manager`,
        `--xpack.fleet.packages.0.version=latest`,
        `--xpack.fleet.internal.fleetServerStandalone=false`,
      ],
    },

    testRunner: startOsqueryCypress,
  };
}
