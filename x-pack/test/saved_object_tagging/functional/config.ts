/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services, pageObjects } from './ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../functional/config.js')
  );

  return {
    testFiles: [require.resolve('./tests')],
    servers: {
      ...kibanaFunctionalConfig.get('servers'),
    },
    services,
    pageObjects,

    esArchiver: {
      directory: path.resolve(__dirname, '..', 'common', 'fixtures', 'es_archiver'),
    },

    junit: {
      reportName: 'X-Pack Saved Object Tagging Functional Tests',
    },

    esTestCluster: kibanaFunctionalConfig.get('esTestCluster'),
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
    },

    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [...kibanaFunctionalConfig.get('kbnTestServer.serverArgs')],
    },
  };
}
