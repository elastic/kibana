/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { UxDashboardPage } from './page_objects';

export interface UxTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    uxDashboard: UxDashboardPage;
  };
}

export const test = baseTest.extend<UxTestFixtures>({
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
    use: (pageObjects: UxTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects: UxTestFixtures['pageObjects'] = {
      ...pageObjects,
      uxDashboard: createLazyPageObject(UxDashboardPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
