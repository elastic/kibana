/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../test_serverless/functional/test_suites/search/config.ts')
  );
  const kbnTestServer = functionalConfig.get('kbnTestServer');

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...kbnTestServer,
      serverArgs: [
        ...kbnTestServer.serverArgs,
        // used for connector simulators
        `--xpack.actions.proxyUrl=http://localhost:6200`,
      ],
    },
  };
}
