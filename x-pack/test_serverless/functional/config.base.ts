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
      esTestCluster: {
        ...svlSharedConfig.get('esTestCluster'),
        serverArgs: [
          ...svlSharedConfig.get('esTestCluster.serverArgs'),
          ...(options.esServerArgs ?? []),
        ],
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          `--serverless=${options.serverlessProject}`,
          ...(options.kbnServerArgs ?? []),
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
        observabilityLogExplorer: {
          pathname: '/app/observability-log-explorer',
        },
        management: {
          pathname: '/app/management',
        },
        indexManagement: {
          pathname: '/app/management/data/index_management',
        },
        transform: {
          pathname: '/app/management/data/transform',
        },
        connectors: {
          pathname: '/app/management/insightsAndAlerting/triggersActionsConnectors/',
        },
        settings: {
          pathname: '/app/management/kibana/settings',
        },
        login: {
          pathname: '/login',
        },
        reportingManagement: {
          pathname: '/app/management/insightsAndAlerting/reporting',
        },
        securitySolution: {
          pathname: '/app/security',
        },
      },
      // choose where screenshots should be saved
      screenshots: {
        directory: resolve(__dirname, 'screenshots'),
      },
      junit: options.junit,
      suiteTags: options.suiteTags,
    };
  };
}
