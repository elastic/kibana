/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, mergeTests, createLazyPageObject } from '@kbn/scout-oblt';
import { SyntheticsAppPage } from './page_objects';
import { syntheticsServicesFixture } from './helpers/synthetics_services';
import type { SyntheticsServicesFixture } from './helpers/synthetics_services';

export interface SyntheticsTestFixtures extends ObltTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    syntheticsApp: SyntheticsAppPage;
  };
}

export interface SyntheticsWorkerFixtures extends ObltWorkerFixtures {
  syntheticsServices: SyntheticsServicesFixture;
}

const syntheticsPageObjectsFixture = baseTest.extend<SyntheticsTestFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ObltTestFixtures['pageObjects'];
      page: ObltTestFixtures['page'];
      kbnUrl: ObltWorkerFixtures['kbnUrl'];
    },
    use: (pageObjects: SyntheticsTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects: SyntheticsTestFixtures['pageObjects'] = {
      ...pageObjects,
      syntheticsApp: createLazyPageObject(SyntheticsAppPage, page, kbnUrl),
    };
    await use(extendedPageObjects);
  },
});

export const test = mergeTests(syntheticsPageObjectsFixture, syntheticsServicesFixture);

export * as testData from './constants';
