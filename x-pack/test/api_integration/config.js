/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SupertestWithoutAuthProvider,
  UsageAPIProvider,
} from './services';

export default async function ({ readConfigFile }) {

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
      es: kibanaCommonConfig.get('services.es'),
      esArchiver: kibanaCommonConfig.get('services.esArchiver'),
      usageAPI: UsageAPIProvider,
      kibanaServer: kibanaCommonConfig.get('services.kibanaServer'),
    },
    esArchiver: xPackFunctionalTestsConfig.get('esArchiver'),
    junit: {
      reportName: 'X-Pack API Integration Tests',
    },
    env: xPackFunctionalTestsConfig.get('env'),
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
      ],
    },
    esTestCluster: xPackFunctionalTestsConfig.get('esTestCluster'),
  };
}
