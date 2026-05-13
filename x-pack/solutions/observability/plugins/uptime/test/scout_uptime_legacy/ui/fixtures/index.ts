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
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: UptimeTestFixtures['pageObjects'] = {
      ...pageObjects,
      uptimeOverview: createLazyPageObject(UptimeOverviewPage, page),
      monitorDetails: createLazyPageObject(MonitorDetailsPage, page),
      uptimeSettings: createLazyPageObject(UptimeSettingsPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
