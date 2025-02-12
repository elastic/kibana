/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

export async function getApiIntegrationConfig({ readConfigFile }: FtrConfigProviderContext) {
  const xPackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  return {
    services,
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    servers: xPackFunctionalTestsConfig.get('servers'),
    security: xPackFunctionalTestsConfig.get('security'),
    junit: {
      reportName: 'X-Pack API Integration Tests',
    },
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.security.session.idleTimeout=3600000', // 1 hour
        '--telemetry.optIn=true',
        '--xpack.fleet.agents.pollingRequestTimeout=5000', // 5 seconds
        '--xpack.ruleRegistry.write.enabled=true',
        '--xpack.ruleRegistry.write.enabled=true',
        '--xpack.ruleRegistry.write.cache.enabled=false',
        '--monitoring_collection.opentelemetry.metrics.prometheus.enabled=true',
      ],
    },
    esTestCluster: {
      ...xPackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        'node.attr.name=apiIntegrationTestNode',
        'path.repo=/tmp/repo,/tmp/repo_1,/tmp/repo_2,/tmp/cloud-snapshots/',
      ],
    },
  };
}

export default getApiIntegrationConfig;
