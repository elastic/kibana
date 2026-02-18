/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { UptimeOverviewPage, MonitorDetailsPage, UptimeSettingsPage } from './page_objects';

export interface UptimeTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    uptimeOverview: UptimeOverviewPage;
    monitorDetails: MonitorDetailsPage;
    uptimeSettings: UptimeSettingsPage;
  };
}

export const test = baseTest.extend<UptimeTestFixtures, ObltWorkerFixtures>({
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
    use: (pageObjects: UptimeTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects: UptimeTestFixtures['pageObjects'] = {
      ...pageObjects,
      uptimeOverview: createLazyPageObject(UptimeOverviewPage, page, kbnUrl),
      monitorDetails: createLazyPageObject(MonitorDetailsPage, page, kbnUrl),
      uptimeSettings: createLazyPageObject(UptimeSettingsPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
