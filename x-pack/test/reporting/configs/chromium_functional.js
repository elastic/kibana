/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async function({ readConfigFile }) {
  const functionalConfig = await readConfigFile(require.resolve('../../functional/config.js'));

  return {
    services: functionalConfig.get('services'),
    pageObjects: functionalConfig.get('pageObjects'),
    servers: functionalConfig.get('servers'),
    apps: functionalConfig.get('apps'),
    screenshots: functionalConfig.get('screenshots'),
    junit: {
      reportName: 'X-Pack Chromium Functional Reporting Tests',
    },
    testFiles: [require.resolve('../functional')],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--logging.events.log',
        '["info","warning","error","fatal","optimize","reporting"]',
        '--xpack.endpoint.enabled=true',
        '--xpack.reporting.csv.enablePanelActionDownload=true',
        '--xpack.security.session.idleTimeout=3600000',
        '--xpack.spaces.enabled=false',
      ],
    },
    esArchiver: functionalConfig.get('esArchiver'),
    esTestCluster: functionalConfig.get('esTestCluster'),
  };
}
