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
  const xPackPlatformApiIntegrationTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/api_integration/config')
  );

  return {
    services,
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    servers: xPackPlatformApiIntegrationTestsConfig.get('servers'),
    security: xPackPlatformApiIntegrationTestsConfig.get('security'),
    junit: {
      reportName: 'X-Pack Observability API Integration Tests',
    },
    kbnTestServer: {
      ...xPackPlatformApiIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [...xPackPlatformApiIntegrationTestsConfig.get('kbnTestServer.serverArgs')],
    },
    esTestCluster: {
      ...xPackPlatformApiIntegrationTestsConfig.get('esTestCluster'),
      serverArgs: [...xPackPlatformApiIntegrationTestsConfig.get('esTestCluster.serverArgs')],
    },
  };
}

export default getApiIntegrationConfig;
