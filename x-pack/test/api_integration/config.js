/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EsProvider,
  EsSupertestWithoutAuthProvider,
  SupertestWithoutAuthProvider,
  UsageAPIProvider,
  InfraOpsGraphQLClientProvider,
  InfraOpsGraphQLClientFactoryProvider,
  SiemGraphQLClientProvider,
  SiemGraphQLClientFactoryProvider,
  InfraOpsSourceConfigurationProvider,
} from './services';

import {
  SecurityServiceProvider,
  SpacesServiceProvider,
} from '../common/services';

export async function getApiIntegrationConfig({ readConfigFile }) {

  const kibanaAPITestsConfig = await readConfigFile(require.resolve('../../../test/api_integration/config.js'));
  const xPackFunctionalTestsConfig = await readConfigFile(require.resolve('../functional/config.js'));
  const kibanaCommonConfig = await readConfigFile(require.resolve('../../../test/common/config.js'));

  return {
    testFiles: [require.resolve('./apis')],
    servers: xPackFunctionalTestsConfig.get('servers'),
    services: {
      supertest: kibanaAPITestsConfig.get('services.supertest'),
      esSupertest: kibanaAPITestsConfig.get('services.esSupertest'),
      supertestWithoutAuth: SupertestWithoutAuthProvider,
      esSupertestWithoutAuth: EsSupertestWithoutAuthProvider,
      infraOpsGraphQLClient: InfraOpsGraphQLClientProvider,
      infraOpsGraphQLClientFactory: InfraOpsGraphQLClientFactoryProvider,
      siemGraphQLClientFactory: SiemGraphQLClientFactoryProvider,
      siemGraphQLClient: SiemGraphQLClientProvider,
      infraOpsSourceConfiguration: InfraOpsSourceConfigurationProvider,
      es: EsProvider,
      esArchiver: kibanaCommonConfig.get('services.esArchiver'),
      usageAPI: UsageAPIProvider,
      kibanaServer: kibanaCommonConfig.get('services.kibanaServer'),
      chance: kibanaAPITestsConfig.get('services.chance'),
      security: SecurityServiceProvider,
      spaces: SpacesServiceProvider,
    },
    esArchiver: xPackFunctionalTestsConfig.get('esArchiver'),
    junit: {
      reportName: 'X-Pack API Integration Tests',
    },
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
      ],
    },
    esTestCluster: {
      ...xPackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        'node.attr.name=apiIntegrationTestNode'
      ],
    },
  };
}

export default getApiIntegrationConfig;
