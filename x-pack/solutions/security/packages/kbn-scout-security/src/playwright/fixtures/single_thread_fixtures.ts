/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest, mergeTests, ApiServicesFixture } from '@kbn/scout';
import { SecurityApiServicesFixture, SecurityTestFixtures, SecurityWorkerFixtures } from './types';
import { getDetectionRuleApiService } from './worker';
import { extendPageObjects, securityBrowserAuthFixture } from './test';

const securityFixtures = mergeTests(baseTest, securityBrowserAuthFixture);

export const test = securityFixtures.extend<SecurityTestFixtures, SecurityWorkerFixtures>({
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
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        log,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: SecurityWorkerFixtures['kbnClient'];
        log: SecurityWorkerFixtures['log'];
      },
      use: (extendedApiServices: SecurityApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as SecurityApiServicesFixture;
      extendedApiServices.detectionRule = getDetectionRuleApiService({
        kbnClient,
        log,
      });

      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});
