/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import { BrowserAuthFixture } from '@kbn/scout/src/playwright/fixtures/test/browser_auth';
import { extendPageObjects } from './test/page_objects';
import { SecurityBrowserAuthFixture, SecurityTestFixtures, SecurityWorkerFixtures } from './types';
import { extendBrowserAuth } from './test/authentication';
import { createDetectionRuleFixture } from './worker/apis/detection_rule';

export const test = base.extend<SecurityTestFixtures, SecurityWorkerFixtures>({
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
    }: { pageObjects: SecurityTestFixtures['pageObjects']; page: SecurityTestFixtures['page'] },
    use: (pageObjects: SecurityTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  detectionRuleApi: [
    async ({ kbnClient, log }, use) => {
      const detectionRuleHelper = await createDetectionRuleFixture({ kbnClient, log });
      await use(detectionRuleHelper);
    },
    { scope: 'worker' },
  ],
});
