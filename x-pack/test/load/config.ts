/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { FtrConfigProviderContext } from '@kbn/test';
import { GatlingTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.js')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    testRunner: GatlingTestRunner,

    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs')],
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      sourceArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.sourceArgs'),
        '--no-base-path',
        '--env.name=development',
      ],
    },
  };
}
