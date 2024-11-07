/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext, findTestPluginPaths } from '@kbn/test';
import { resolve } from 'path';
import { REPO_ROOT as KIBANA_ROOT } from '@kbn/repo-info';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  return {
    // default to the xpack functional config
    ...xpackFunctionalConfig.getAll(),

    junit: {
      reportName: 'X-Pack Example plugin functional tests',
    },

    testFiles: [
      require.resolve('./search_examples'),
      require.resolve('./embedded_lens'),
      require.resolve('./screenshotting'),
      require.resolve('./triggers_actions_ui_examples'),
    ],

    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),

      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        // Required to load new platform plugins via `--plugin-path` flag.
        '--env.name=development',
        ...findTestPluginPaths([
          resolve(KIBANA_ROOT, 'examples'),
          resolve(KIBANA_ROOT, 'x-pack/examples'),
        ]),
      ],
    },
  };
}
