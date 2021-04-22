/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));
  const plugin = resolve(__dirname, './fixtures/session/session_user_data');

  return {
    testFiles: [resolve(__dirname, './tests/session_user_data')],
    services,
    servers: xPackAPITestsConfig.get('servers'),
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${plugin}`,
      ],
    },

    junit: {
      reportName: 'X-Pack Security API Integration Tests (Session User Data)',
    },
  };
}
