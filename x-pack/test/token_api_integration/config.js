/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async function({ readConfigFile }) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));

  return {
    testFiles: [require.resolve('./auth')],
    servers: xPackAPITestsConfig.get('servers'),
    services: {
      legacyEs: xPackAPITestsConfig.get('services.legacyEs'),
      supertestWithoutAuth: xPackAPITestsConfig.get('services.supertestWithoutAuth'),
    },
    junit: {
      reportName: 'Token-auth API Integration Tests',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
        '--xpack.security.authc.providers=["token"]',
      ],
    },
  };
}
