/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObltPageObjects,
  ObltTestFixtures,
  ObltWorkerFixtures,
  KibanaUrl,
} from '@kbn/scout-oblt';
import { test as base, createLazyPageObject } from '@kbn/scout-oblt';
import { InventoryPage } from './page_objects/inventory';

export interface ExtendedScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    inventoryPage: InventoryPage;
  };
}

export const test = base.extend<ExtendedScoutTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
      page: ExtendedScoutTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      inventoryPage: createLazyPageObject(InventoryPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});
