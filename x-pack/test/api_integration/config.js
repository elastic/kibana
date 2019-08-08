/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { services } from './services';

import { SLACK_ACTION_SIMULATOR_URI } from './fixtures/plugins/actions';

export async function getApiIntegrationConfig({ readConfigFile }) {
  const xPackFunctionalTestsConfig = await readConfigFile(require.resolve('../functional/config.js'));

  return {
    testFiles: [require.resolve('./apis')],
    services,
    servers: xPackFunctionalTestsConfig.get('servers'),
    esArchiver: xPackFunctionalTestsConfig.get('esArchiver'),
    junit: {
      reportName: 'X-Pack API Integration Tests',
    },
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
        `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'alerts')}`,
        `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'actions')}`,
        `--server.xsrf.whitelist=${JSON.stringify([SLACK_ACTION_SIMULATOR_URI])}`,
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
