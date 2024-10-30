/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { REPO_ROOT as KIBANA_ROOT } from '@kbn/repo-info';
import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const commonConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...commonConfig.getAll(),
    testFiles: [require.resolve('./public')],
    kbnTestServer: {
      ...commonConfig.get('kbnTestServer'),
      serverArgs: [
        ...commonConfig.get('kbnTestServer.serverArgs'),
        // Required to load new platform plugin provider via `--plugin-path` flag.
        '--env.name=development',
        `--plugin-path=${path.resolve(
          KIBANA_ROOT,
          'test/plugin_functional/plugins/core_provider_plugin'
        )}`,
        `--plugin-path=${path.resolve(__dirname, 'plugins/test_feature_usage')}`,
      ],
    },
  };
}
