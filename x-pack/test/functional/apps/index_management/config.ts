/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.js'));
  const configBase = functionalConfig.getAll();

  return {
    ...configBase,
    kbnTestServer: {
      ...configBase.kbnTestServer,
      serverArgs: [
        ...configBase.kbnTestServer.serverArgs,
        // Removing the Observability plugin since the SLO feature now installs
        // an enrich policy by default. The tests expect to start with a fresh
        // install without enrich policies.
        '--xpack.observability.enabled=false',
      ],
    },
    testFiles: [require.resolve('.')],
  };
}
