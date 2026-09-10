/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltPageObjects, ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { ObservabilityAlertingPage } from './page_objects';

export interface ExtScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    observabilityAlerting: ObservabilityAlertingPage;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
      kbnUrl: ObltWorkerFixtures['kbnUrl'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      observabilityAlerting: createLazyPageObject(ObservabilityAlertingPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});
