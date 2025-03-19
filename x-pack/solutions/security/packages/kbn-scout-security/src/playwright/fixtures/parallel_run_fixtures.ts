/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient, ScoutLogger, spaceTest as spaceBase } from '@kbn/scout';
import { BrowserAuthFixture } from '@kbn/scout/src/playwright/fixtures/test/browser_auth';
import { ScoutSpaceParallelFixture } from '@kbn/scout/src/playwright/fixtures/worker';
import { extendPageObjects } from './test/page_objects';
import {
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
  SecurityBrowserAuthFixture,
  SecurityApiServicesFixture,
} from './types';
import { extendBrowserAuth } from './test/authentication';
import { createDetectionRuleFixture } from './worker/apis/detection_rule';

/**
 * Should be used test spec files, running in parallel in isolated spaces agaist the same Kibana instance.
 */
export const spaceTest = spaceBase.extend<
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures
>({
  browserAuth: async (
    { browserAuth }: { browserAuth: BrowserAuthFixture },
    use: (auth: SecurityBrowserAuthFixture) => Promise<void>
  ) => {
    const extendedAuth = await extendBrowserAuth(browserAuth);
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
        kbnClient,
        log,
        scoutSpace,
      }: { kbnClient: KbnClient; log: ScoutLogger; scoutSpace: ScoutSpaceParallelFixture },
      use: (services: SecurityApiServicesFixture) => Promise<void>
    ) => {
      const detectionRuleHelper = await createDetectionRuleFixture({ kbnClient, log, scoutSpace });

      const apiServices: SecurityApiServicesFixture = {
        detectionRule: detectionRuleHelper,
      };

      await use(apiServices);
    },
    { scope: 'worker' },
  ],
});
