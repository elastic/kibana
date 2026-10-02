/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, SecurityPageObjects, SecurityTestFixtures } from '@kbn/scout-security';
import { spaceTest as baseSpaceTest, createLazyPageObject } from '@kbn/scout-security';
import { WatchSettingsPage } from './page_objects';

interface AlertZeroTestFixtures extends SecurityTestFixtures {
  pageObjects: SecurityPageObjects & { watchSettings: WatchSettingsPage };
}

export const spaceTest = baseSpaceTest.extend<AlertZeroTestFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AlertZeroTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: AlertZeroTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      watchSettings: createLazyPageObject(WatchSettingsPage, page),
    });
  },
});

export * as testData from './constants';
