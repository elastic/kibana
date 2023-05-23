/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { FtrConfigProviderContext } from '@kbn/test';

import { pageObjects } from './page_objects';
import { services } from './services';
import type { CreateTestConfigOptions } from '../shared/types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(require.resolve('../shared/config.base.ts'));

    return {
      ...svlSharedConfig.getAll(),

      pageObjects,
      services,
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          `--serverless${options.serverlessProject ? `=${options.serverlessProject}` : ''}`,
        ],
      },
      testFiles: options.testFiles,

      uiSettings: {
        defaults: {
          'accessibility:disableAnimations': true,
          'dateFormat:tz': 'UTC',
        },
      },
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
      // choose where screenshots should be saved
      screenshots: {
        directory: resolve(__dirname, 'screenshots'),
      },
    };
  };
}
