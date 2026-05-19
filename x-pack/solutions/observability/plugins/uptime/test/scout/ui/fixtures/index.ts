/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { UptimeAppPage } from './page_objects';

export interface UptimeTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    uptimeApp: UptimeAppPage;
  };
}

export const test = baseTest.extend<UptimeTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: UptimeTestFixtures['pageObjects'];
      page: UptimeTestFixtures['page'];
      kbnUrl: ScoutWorkerFixtures['kbnUrl'];
    },
    use: (pageObjects: UptimeTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      uptimeApp: createLazyPageObject(UptimeAppPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
