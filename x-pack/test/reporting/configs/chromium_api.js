/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingAPIProvider } from '../services';

export default async function({ readConfigFile }) {
  const apiConfig = await readConfigFile(require.resolve('../../api_integration/config.js'));
  const functionalConfig = await readConfigFile(require.resolve('../../functional/config.js'));

  return {
    servers: apiConfig.get('servers'),
    junit: { reportName: 'X-Pack Chromium API Reporting Tests' },
    testFiles: [require.resolve('../api/chromium_tests')],
    services: {
      ...apiConfig.get('services'),
      reportingAPI: ReportingAPIProvider,
    },
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [
        // Reporting API tests use functionalConfig instead of apiConfig because they needs a fully working UI. By default, the API config
        // does not have optimize setting enabled, and Kibana would not have a working UI.
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--logging.events.log',
        '["info","warning","error","fatal","optimize","reporting"]',
        '--xpack.reporting.csv.enablePanelActionDownload=true',
        '--xpack.reporting.capture.maxAttempts=1',
        '--xpack.security.session.idleTimeout=3600000',
        '--xpack.spaces.enabled=false',
      ],
    },
    esArchiver: apiConfig.get('esArchiver'),
    esTestCluster: apiConfig.get('esTestCluster'),
  };
}
