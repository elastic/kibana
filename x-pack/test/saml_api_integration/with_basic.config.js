/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async function ({ readConfigFile }) {
  const samlAPITestsConfig = await readConfigFile(require.resolve('./config.js'));

  return {
    testFiles: [require.resolve('./apis/with_basic')],
    servers: samlAPITestsConfig.get('servers'),
    services: samlAPITestsConfig.get('services'),
    junit: {
      reportName: 'X-Pack SAML API Integration Tests (with Basic)',
    },

    esTestCluster: samlAPITestsConfig.get('esTestCluster'),

    kbnTestServer: {
      ...samlAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...samlAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.security.authProviders=[\"basic\",\"saml\"]',
      ],
    },
  };
}
