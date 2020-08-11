/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('../../../test/api_integration/config.js')
  );
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testFiles: [resolve(__dirname, './tests/session_lifespan')],

    services: {
      legacyEs: kibanaAPITestsConfig.get('services.legacyEs'),
      supertestWithoutAuth: xPackAPITestsConfig.get('services.supertestWithoutAuth'),
    },

    servers: xPackAPITestsConfig.get('servers'),
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.security.session.lifespan=5s',
        '--xpack.security.session.cleanupInterval=10s',
      ],
    },

    junit: {
      reportName: 'X-Pack Security API Integration Tests',
    },
  };
}
