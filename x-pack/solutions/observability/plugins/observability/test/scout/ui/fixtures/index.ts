/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest } from '@kbn/scout-oblt';
import type { TriggersActionsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface TriggersActionsTestFixtures extends ScoutTestFixtures {
  pageObjects: TriggersActionsPageObjects;
}

export const test = baseTest.extend<TriggersActionsTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: TriggersActionsPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: TriggersActionsPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});

export { RULES_SETTINGS_TEST_SUBJECTS } from './constants';
