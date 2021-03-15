/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from '../functional/services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    // default to the xpack functional config
    ...xpackFunctionalConfig.getAll(),

    junit: {
      reportName: 'X-Pack Background Search UI (Enabled WIP Feature)',
    },

    testFiles: [
      resolve(__dirname, './tests/apps/dashboard/async_search'),
      resolve(__dirname, './tests/apps/discover'),
      resolve(__dirname, './tests/apps/lens'),
      resolve(__dirname, './tests/apps/management/search_sessions'),
    ],

    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        '--xpack.data_enhanced.search.sessions.enabled=true', // enable WIP send to background UI
      ],
    },
    services,
  };
}
