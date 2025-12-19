/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { pageObjects } from './page_objects';

/**
 * NOTE: The solution view is currently only available in the cloud environment.
 * This test suite fakes a cloud environment by setting the cloud.id and cloud.base_url
 */

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/functional/config.base')
  );

  return {
    ...functionalConfig.getAll(),
    services,
    pageObjects,
    junit: {
      reportName: 'Search Solution UI Functional Tests',
    },
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: [
        ...functionalConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enabled=true',
      ],
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--uiSettings.overrides.eisPromotionalTour:enabled=false`,
      ],
    },
    testFiles: [require.resolve('.')],
    screenshots: { directory: resolve(__dirname, '../screenshots') },
    apps: {
      ...functionalConfig.get('apps'),
      searchInferenceEndpoints: {
        pathname: '/app/elasticsearch/relevance/inference_endpoints',
      },
      searchOverview: {
        pathname: '/app/elasticsearch/overview',
      },
      searchHomepage: {
        pathname: '/app/elasticsearch/home',
      },
      searchGettingStarted: {
        pathname: '/app/elasticsearch/getting_started',
      },
    },
  };
}
