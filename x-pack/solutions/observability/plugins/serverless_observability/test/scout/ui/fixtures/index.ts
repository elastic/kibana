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
} from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { ServerlessNav } from './page_objects';

export interface ExtScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    serverlessNav: ServerlessNav;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutTestFixtures['pageObjects'];
      page: ExtScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      serverlessNav: createLazyPageObject(ServerlessNav, page),
    };

    await use(extendedPageObjects);
  },
});
