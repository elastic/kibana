/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout';
import { spaceTest as baseTest, mergeTests } from '@kbn/scout';
import type {
  SecurityApiServicesFixture,
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
} from './types';
import {
  getDetectionRuleApiService,
  getAssistantCleanupService,
  getBrowserScopedAssistantService,
  getConnectorsApiService,
} from './worker';
import { extendPageObjects, securityBrowserAuthFixture } from './test';

const securityParallelFixtures = mergeTests(baseTest, securityBrowserAuthFixture);

/**
 * Should be used test spec files, running in parallel in isolated spaces agaist the same Kibana instance.
 */
export const spaceTest = securityParallelFixtures.extend<
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SecurityParallelTestFixtures['pageObjects'];
      page: SecurityParallelTestFixtures['page'];
    },
    use: (pageObjects: SecurityParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
        scoutSpace,
        esClient,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: SecurityParallelWorkerFixtures['kbnClient'];
        log: SecurityParallelWorkerFixtures['log'];
        scoutSpace: SecurityParallelWorkerFixtures['scoutSpace'];
        esClient: SecurityParallelWorkerFixtures['esClient'];
      },
      use: (extendedApiServices: SecurityApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as SecurityApiServicesFixture;
      extendedApiServices.detectionRule = getDetectionRuleApiService({
        kbnClient,
        log,
        scoutSpace,
        esClient,
      });
      extendedApiServices.assistant = getAssistantCleanupService({
        esClient,
        scoutSpace,
      });
      extendedApiServices.connectors = getConnectorsApiService({
        kbnClient,
        log,
        scoutSpace,
      });

      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
  browserScopedApis: async (
    {
      page,
      scoutSpace,
      config,
    }: {
      page: SecurityParallelTestFixtures['page'];
      scoutSpace: SecurityParallelWorkerFixtures['scoutSpace'];
      config: SecurityParallelWorkerFixtures['config'];
    },
    use
  ) => {
    await use({
      assistant: getBrowserScopedAssistantService({
        page,
        kbnUrl: config.hosts.kibana,
        scoutSpace,
      }),
    });
  },
});
