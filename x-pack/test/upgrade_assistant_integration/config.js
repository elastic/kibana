/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import {
  LegacyEsProvider,
} from './services';

export default async function ({ readConfigFile }) {

  // Read the Kibana API integration tests config file so that we can utilize its services.
  const kibanaAPITestsConfig = await readConfigFile(require.resolve('../../../test/api_integration/config.js'));
  const xPackFunctionalTestsConfig = await readConfigFile(require.resolve('../functional/config.js'));
  const kibanaCommonConfig = await readConfigFile(require.resolve('../../../test/common/config.js'));

  return {
    testFiles: [require.resolve('./upgrade_assistant')],
    servers: xPackFunctionalTestsConfig.get('servers'),
    services: {
      ...kibanaCommonConfig.get('services'),
      supertest: kibanaAPITestsConfig.get('services.supertest'),
      legacyEs: LegacyEsProvider,
    },
    esArchiver: xPackFunctionalTestsConfig.get('esArchiver'),
    junit: {
      reportName: 'X-Pack Upgrade Assistant Integration Tests',
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
      dataArchive: path.resolve(__dirname, './fixtures/data_archives/upgrade_assistant.zip'),
    }
  };
}
