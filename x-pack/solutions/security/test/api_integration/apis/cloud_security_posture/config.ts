/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext, getKibanaCliLoggers } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../config.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        `--logging.loggers=${JSON.stringify([
          ...getKibanaCliLoggers(baseConfig.get('kbnTestServer.serverArgs')),
          {
            name: 'plugins.cloudSecurityPosture',
            level: 'all',
            appenders: ['default'],
          },
        ])}`,
      ],
    },
  };
}
