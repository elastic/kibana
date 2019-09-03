/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const path = require('path');

import { ReportingAPIProvider } from '../services';

export async function getReportingApiConfig({ readConfigFile }) {

  const apiConfig = await readConfigFile(require.resolve('../../api_integration/config.js'));

  return {
    servers: apiConfig.get('servers'),
    services: {
      ...apiConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
    },
    esArchiver: {
      directory: path.resolve(__dirname, '../es_archives')
    },
    junit: {
      reportName: 'X-Pack Reporting API Tests',
    },
    testFiles: [require.resolve('../api/generate')],
    esTestCluster: apiConfig.get('esTestCluster'),
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [
        ...apiConfig.get('kbnTestServer.serverArgs'),
        '--xpack.reporting.csv.enablePanelActionDownload=true',
        `--optimize.enabled=true`,
        '--logging.events.log', JSON.stringify(['info', 'warning', 'error', 'fatal', 'optimize', 'reporting'])
      ],
    },
  };
}

export default getReportingApiConfig;
