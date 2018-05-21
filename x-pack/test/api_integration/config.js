/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolveKibanaPath } from '@kbn/plugin-helpers';
import { SupertestWithoutAuthProvider } from './services';

export default async function ({ readConfigFile }) {

  // Read the Kibana API integration tests config file so that we can utilize its services.
  const kibanaAPITestsConfig = await readConfigFile(resolveKibanaPath('test/api_integration/config.js'));
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
    },
    esArchiver: xPackFunctionalTestsConfig.get('esArchiver'),
    junit: {
      reportName: 'X-Pack API Integration Tests',
    },
    env: xPackFunctionalTestsConfig.get('env'),
    kbnTestServer: xPackFunctionalTestsConfig.get('kbnTestServer'),
    esTestCluster: xPackFunctionalTestsConfig.get('esTestCluster'),
  };
}
