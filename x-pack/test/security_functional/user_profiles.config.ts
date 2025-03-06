/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { pageObjects } from '../functional/page_objects';
import { services } from '../functional/services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackKibanaFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const testEndpointsPlugin = resolve(__dirname, './plugins/test_endpoints');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [resolve(__dirname, './tests/user_profiles')],

    services,
    pageObjects,

    servers: xPackKibanaFunctionalConfig.get('servers'),
    esTestCluster: xPackKibanaFunctionalConfig.get('esTestCluster'),

    kbnTestServer: {
      ...xPackKibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackKibanaFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${testEndpointsPlugin}`,
      ],
    },
    apps: {
      ...xPackKibanaFunctionalConfig.get('apps'),
      user_profiles_app: { pathname: '/app/user_profiles_app' },
    },

    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests (User Profiles)',
    },
  };
}
