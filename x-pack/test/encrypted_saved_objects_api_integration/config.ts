/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    testFiles: [require.resolve('./tests')],
    servers: xPackAPITestsConfig.get('servers'),
    services,
    junit: {
      reportName: 'X-Pack Encrypted Saved Objects API Integration Tests',
    },
    esArchiver: {
      directory: path.join(__dirname, 'fixtures', 'es_archiver'),
    },
    esTestCluster: xPackAPITestsConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.encryptedSavedObjects.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
        `--plugin-path=${path.resolve(__dirname, './fixtures/api_consumer_plugin')}`,
      ],
    },
  };
}
