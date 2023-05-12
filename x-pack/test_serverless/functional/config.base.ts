/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import { services } from './services';
import type { CreateTestConfigOptions } from '../shared_types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackFunctionalTestsConfig = await readConfigFile(
      // eslint-disable-next-line @kbn/imports/no_boundary_crossing
      require.resolve('../../test/functional/config.base.js')
    );

    return {
      pageObjects,
      services,
      servers: xPackFunctionalTestsConfig.get('servers'),
      uiSettings: xPackFunctionalTestsConfig.get('uiSettings'),
      kbnTestServer: {
        ...xPackFunctionalTestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
          `--serverless${options.serverlessProject ? `=${options.serverlessProject}` : ''}`,
        ],
      },
      esTestCluster: {
        ...xPackFunctionalTestsConfig.get('esTestCluster'),
        serverArgs: ['xpack.security.enabled=false'],
      },
      testFiles: options.testFiles,
      // the apps section defines the urls that
      // `PageObjects.common.navigateTo(appKey)` will use.
      // Merge urls for your plugin with the urls defined in
      // Kibana's config in order to use this helper
      apps: {
        home: {
          pathname: '/app/home',
          hash: '/',
        },
        landingPage: {
          pathname: '/',
        },
        observability: {
          pathname: '/app/observability',
        },
      },
    };
  };
}
