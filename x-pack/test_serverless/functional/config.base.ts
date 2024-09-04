/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { resolve } from 'path';

import { FtrConfigProviderContext, defineDockerServersConfig } from '@kbn/test';

import { dockerImage } from '@kbn/test-suites-xpack/fleet_api_integration/config.base';
import { pageObjects } from './page_objects';
import { services } from './services';
import type { CreateTestConfigOptions } from '../shared/types';

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(require.resolve('../shared/config.base.ts'));
    const packageRegistryConfig = path.join(__dirname, './common/package_registry_config.yml');
    const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

    /**
     * This is used by CI to set the docker registry port
     * you can also define this environment variable locally when running tests which
     * will spin up a local docker package registry locally for you
     * if this is defined it takes precedence over the `packageRegistryOverride` variable
     */
    const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

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
      dockerServers: defineDockerServersConfig({
        registry: {
          enabled: !!dockerRegistryPort,
          image: dockerImage,
          portInContainer: 8080,
          port: dockerRegistryPort,
          args: dockerArgs,
          waitForLogLine: 'package manifests loaded',
          waitForLogLineTimeoutMs: 60 * 2 * 10000, // 2 minutes
        },
      }),
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
