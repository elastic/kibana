/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiServicesFixture, spaceTest as spaceBase } from '@kbn/scout';
import { BrowserAuthFixture } from '@kbn/scout/src/playwright/fixtures/test/browser_auth';
import { SamlAuth, ScoutLogger, ScoutTestConfig } from '@kbn/scout/src/playwright/fixtures/worker';
import { extendPageObjects } from './test/page_objects';
import {
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
  SecurityBrowserAuthFixture,
  SecurityApiServicesFixture,
} from './types';
import { extendBrowserAuth } from './test/authentication';
import { getDetectionRuleApiService } from './worker/apis';

/**
 * Should be used test spec files, running in parallel in isolated spaces agaist the same Kibana instance.
 */
export const spaceTest = spaceBase.extend<
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures
>({
  browserAuth: async (
    {
      browserAuth,
      config,
      samlAuth,
      log,
    }: {
      browserAuth: BrowserAuthFixture;
      config: ScoutTestConfig;
      samlAuth: SamlAuth;
      log: ScoutLogger;
    },
    use: (auth: SecurityBrowserAuthFixture) => Promise<void>
  ) => {
    const extendedAuth = await extendBrowserAuth(browserAuth, config, samlAuth, log);
    await use(extendedAuth);
  },
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
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: SecurityParallelWorkerFixtures['kbnClient'];
        log: SecurityParallelWorkerFixtures['log'];
        scoutSpace: SecurityParallelWorkerFixtures['scoutSpace'];
      },
      use: (extendedApiServices: SecurityApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as SecurityApiServicesFixture;
      extendedApiServices.detectionRule = getDetectionRuleApiService({
        kbnClient,
        log,
        scoutSpace,
      });

      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});
