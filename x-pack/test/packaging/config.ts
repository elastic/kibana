/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    testFiles: [require.resolve('./index.ts')],
    services: functionalConfig.get('services'),
    pageObjects: functionalConfig.get('pageObjects'),
    servers: functionalConfig.get('servers'),
    esTestCluster: functionalConfig.get('esTestCluster'),
    apps: {},
    esArchiver: {
      directory: path.resolve(__dirname, '../functional/es_archives'),
    },
    snapshots: {
      directory: path.resolve(__dirname, 'snapshots'),
    },
    junit: {
      reportName: 'Packaging integration tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [...functionalConfig.get('kbnTestServer.serverArgs')],
    },
  };
}
