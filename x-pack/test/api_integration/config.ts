/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';

export async function getApiIntegrationConfig({ readConfigFile }: FtrConfigProviderContext) {
  const xPackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.js')
  );

  return {
    testFiles: [require.resolve('./apis')],
    services,
    servers: xPackFunctionalTestsConfig.get('servers'),
    security: xPackFunctionalTestsConfig.get('security'),
    esArchiver: xPackFunctionalTestsConfig.get('esArchiver'),
    junit: {
      reportName: 'X-Pack API Integration Tests',
    },
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--map.proxyElasticMapsServiceInMaps=true',
        '--xpack.security.session.idleTimeout=3600000', // 1 hour
        '--telemetry.optIn=true',
        '--xpack.fleet.enabled=true',
        '--xpack.fleet.agents.pollingRequestTimeout=5000', // 5 seconds
        '--xpack.data_enhanced.search.sessions.enabled=true', // enable WIP send to background UI
      ],
    },
    esTestCluster: {
      ...xPackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        'node.attr.name=apiIntegrationTestNode',
      ],
    },
  };
}

export default getApiIntegrationConfig;
