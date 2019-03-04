/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

// tslint:disable:no-default-export
export default async function ({ readConfigFile }) {
  const integrationConfig = await readConfigFile(require.resolve('../../api_integration/config'));
  return {
    testFiles: [require.resolve('../api/generate')],
    services: integrationConfig.get('services'),
    pageObjects: integrationConfig.get('pageObjects'),
    servers: integrationConfig.get('servers'),
    esTestCluster: integrationConfig.get('esTestCluster'),
    apps: integrationConfig.get('apps'),
    esArchiver: { directory: path.resolve(__dirname, '../../../test/functional/es_archives') },
    junit: { reportName: 'X-Pack Reporting Generate API Integration Tests' },
    kbnTestServer: {
      ...integrationConfig.get('kbnTestServer'),
      serverArgs: integrationConfig.get('kbnTestServer.serverArgs'),
    },
  };
}
