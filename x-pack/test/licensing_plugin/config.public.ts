/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import { KIBANA_ROOT } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function({ readConfigFile }: FtrConfigProviderContext) {
  const commonConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...commonConfig.getAll(),
    testFiles: [require.resolve('./public')],
    kbnTestServer: {
      serverArgs: [
        ...commonConfig.get('kbnTestServer.serverArgs'),

        // Required to load new platform plugin provider via `--plugin-path` flag.
        '--env.name=development',
        `--plugin-path=${path.resolve(
          KIBANA_ROOT,
          'test/plugin_functional/plugins/core_provider_plugin'
        )}`,
      ],
    },
  };
}
