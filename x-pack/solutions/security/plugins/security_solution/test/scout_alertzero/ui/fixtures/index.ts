/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject, test as baseTest } from '@kbn/scout-security';
import type {
  ScoutPage,
  SecurityPageObjects,
  SecurityTestFixtures,
  SecurityWorkerFixtures,
} from '@kbn/scout-security';
import { AlertZeroQueuePage } from './page_objects';

export interface AlertZeroTestFixtures extends SecurityTestFixtures {
  pageObjects: SecurityPageObjects & {
    alertZeroQueue: AlertZeroQueuePage;
  };
}

export const test = baseTest.extend<AlertZeroTestFixtures, SecurityWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (pageObjects: AlertZeroTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      alertZeroQueue: createLazyPageObject(AlertZeroQueuePage, page),
    });
  },
});

export * as testData from './constants';
