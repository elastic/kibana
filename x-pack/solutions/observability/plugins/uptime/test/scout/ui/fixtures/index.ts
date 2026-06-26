/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import {
  UptimeAppPage,
  UptimeOverviewPage,
  MonitorDetailsPage,
  UptimeSettingsPage,
} from './page_objects';

export interface UptimeTestFixtures extends ObltTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    uptimeApp: UptimeAppPage;
    uptimeOverview: UptimeOverviewPage;
    monitorDetails: MonitorDetailsPage;
    uptimeSettings: UptimeSettingsPage;
  };
}

export const test = baseTest.extend<UptimeTestFixtures>({
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
      uptimeApp: createLazyPageObject(UptimeAppPage, page, kbnUrl),
      uptimeOverview: createLazyPageObject(UptimeOverviewPage, page),
      monitorDetails: createLazyPageObject(MonitorDetailsPage, page),
      uptimeSettings: createLazyPageObject(UptimeSettingsPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
