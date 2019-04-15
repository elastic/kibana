/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const path = require('path');

export async function getFunctionalConfig({ readConfigFile }) {
  const xPackFunctionalTestsConfig = await readConfigFile(require.resolve('../../functional/config.js'));

  return {
    services: xPackFunctionalTestsConfig.get('services'),
    pageObjects: xPackFunctionalTestsConfig.get('pageObjects'),
    servers: xPackFunctionalTestsConfig.get('servers'),
    esTestCluster: xPackFunctionalTestsConfig.get('esTestCluster'),
    apps: xPackFunctionalTestsConfig.get('apps'),
    esArchiver: {
      directory: path.resolve(__dirname, '../es_archives')
    },
    screenshots: xPackFunctionalTestsConfig.get('screenshots'),
    junit: {
      reportName: 'X-Pack Reporting Functional Tests',
    },
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.reporting.csv.enablePanelActionDownload=true',
        '--logging.events.log', JSON.stringify(['info', 'warning', 'error', 'fatal', 'optimize', 'reporting'])
      ],
    },
    testFiles: [require.resolve('../functional')],
  };
}

export default getFunctionalConfig;
