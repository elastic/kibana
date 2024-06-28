/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseIntegrationTestsConfig = await readConfigFile(require.resolve('../../config.ts'));

  return {
    ...baseIntegrationTestsConfig.getAll(),
    esTestCluster: {
      ...baseIntegrationTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...baseIntegrationTestsConfig.get('esTestCluster.serverArgs'),
        'xpack.ml.enabled=false',
      ],
    },
    kbnTestServer: {
      ...baseIntegrationTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.uptime.service.password=test',
        '--xpack.uptime.service.username=localKibanaIntegrationTestsUser',
        '--xpack.uptime.service.devUrl=mockDevUrl',
        '--xpack.uptime.service.manifestUrl=mockDevUrl',
      ],
    },
    testFiles: [require.resolve('.')],
  };
}
