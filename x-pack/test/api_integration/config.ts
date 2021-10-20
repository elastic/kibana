/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
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
        '--xpack.fleet.agents.pollingRequestTimeout=5000', // 5 seconds
        '--xpack.data_enhanced.search.sessions.enabled=true', // enable WIP send to background UI
        '--xpack.data_enhanced.search.sessions.notTouchedTimeout=15s', // shorten notTouchedTimeout for quicker testing
        '--xpack.data_enhanced.search.sessions.trackingInterval=5s', // shorten trackingInterval for quicker testing
        '--xpack.data_enhanced.search.sessions.cleanupInterval=5s', // shorten cleanupInterval for quicker testing
        '--xpack.ruleRegistry.write.enabled=true',
      ],
    },
    esTestCluster: {
      ...xPackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        'node.attr.name=apiIntegrationTestNode',
        'path.repo=/tmp/repo,/tmp/repo_1,/tmp/repo_2',
      ],
    },
  };
}

export default getApiIntegrationConfig;
