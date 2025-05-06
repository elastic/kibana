/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { resolve } from 'path';
import { pageObjects } from './page_objects';
import { services } from './services';
import type { CreateTestConfigOptions } from '../shared/types';

export function createTestConfig<TServices extends {} = typeof services>(
  options: CreateTestConfigOptions<TServices>
) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(require.resolve('../shared/config.base.ts'));

    return {
      ...svlSharedConfig.getAll(),

      testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
      pageObjects,
      services: { ...services, ...options.services },
      esTestCluster: {
        ...svlSharedConfig.get('esTestCluster'),
        serverArgs: [
          ...svlSharedConfig.get('esTestCluster.serverArgs'),
          // custom native roles are enabled only for search and security projects
          ...(options.serverlessProject !== 'oblt'
            ? ['xpack.security.authc.native_roles.enabled=true']
            : []),
          ...(options.esServerArgs ?? []),
        ],
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          `--serverless=${options.serverlessProject}`,
          // Ensures the existing E2E tests are backwards compatible with the old rule create flyout
          // Remove this experiment once all of the migration has been completed
          `--xpack.trigger_actions_ui.enableExperimental=${JSON.stringify([
            'isUsingRuleCreateFlyout',
          ])}`,
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
        observabilityLogsExplorer: {
          pathname: '/app/observability-logs-explorer',
        },
        observabilityOnboarding: {
          pathname: '/app/observabilityOnboarding',
        },
        management: {
          pathname: '/app/management',
        },
        indexManagement: {
          pathname: '/app/management/data/index_management',
        },
        ingestPipelines: {
          pathname: '/app/management/ingest/ingest_pipelines',
        },
        transform: {
          pathname: '/app/management/data/transform',
        },
        connectors: {
          pathname: '/app/management/insightsAndAlerting/triggersActionsConnectors/',
        },
        triggersActions: {
          pathname: '/app/management/insightsAndAlerting/triggersActions',
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
        dashboard: {
          pathname: '/app/dashboards',
        },
        discover: {
          pathname: '/app/discover',
        },
        context: {
          pathname: '/app/discover',
          hash: '/context',
        },
        searchProfiler: {
          pathname: '/app/dev_tools',
          hash: '/searchprofiler',
        },
        maintenanceWindows: {
          pathname: '/app/management/insightsAndAlerting/maintenanceWindows',
        },
        fleet: {
          pathname: '/app/fleet',
        },
        integrations: {
          pathname: '/app/integrations',
        },
        ...(options.apps ?? {}),
      },
      // choose where screenshots should be saved
      screenshots: {
        directory: resolve(__dirname, 'screenshots'),
      },
      failureDebugging: {
        htmlDirectory: resolve(__dirname, 'failure_debug', 'html'),
      },
      junit: options.junit,
      suiteTags: options.suiteTags,
    };
  };
}
