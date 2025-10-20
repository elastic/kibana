/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { TEST_FLEET_PORT } from '@kbn/test-services';

import { getServerlessNodeArgs } from '@kbn/es';
import { startOsqueryCypress } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const securitySolutionCypressConfig = await readConfigFile(
    require.resolve('./serverless_config.base.ts')
  );

  const nodeArgs = await getServerlessNodeArgs(undefined, undefined);

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
        `--xpack.fleet.agents.fleet_server.hosts=["https://host.docker.internal:${TEST_FLEET_PORT}"]`,
        `--xpack.fleet.agents.elasticsearch.host=http://${
          nodeArgs[0].name
        }:${securitySolutionCypressConfig.get('servers.elasticsearch.port')}`,
        `--xpack.fleet.packages.0.name=osquery_manager`,
        `--xpack.fleet.packages.0.version=latest`,
      ],
    },

    testRunner: startOsqueryCypress,
  };
}
