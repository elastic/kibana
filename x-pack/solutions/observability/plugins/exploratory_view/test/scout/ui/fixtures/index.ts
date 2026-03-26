/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObltTestFixtures,
  ObltWorkerFixtures,
  ObltParallelTestFixtures,
  ObltParallelWorkerFixtures,
} from '@kbn/scout-oblt';
import {
  test as baseTest,
  spaceTest as spaceBaseTest,
  createLazyPageObject,
} from '@kbn/scout-oblt';
import { ExploratoryViewPage } from './page_objects';

export interface ExploratoryViewTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    exploratoryView: ExploratoryViewPage;
  };
}

export const test = baseTest.extend<ExploratoryViewTestFixtures>({
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
    use: (pageObjects: ExploratoryViewTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects: ExploratoryViewTestFixtures['pageObjects'] = {
      ...pageObjects,
      exploratoryView: createLazyPageObject(ExploratoryViewPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

export interface ExploratoryViewParallelTestFixtures {
  pageObjects: ObltParallelTestFixtures['pageObjects'] & {
    exploratoryView: ExploratoryViewPage;
  };
}

export const spaceTest = spaceBaseTest.extend<
  ExploratoryViewParallelTestFixtures,
  ObltParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ObltParallelTestFixtures['pageObjects'];
      page: ObltParallelTestFixtures['page'];
      kbnUrl: ObltParallelWorkerFixtures['kbnUrl'];
    },
    use: (pageObjects: ExploratoryViewParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects: ExploratoryViewParallelTestFixtures['pageObjects'] = {
      ...pageObjects,
      exploratoryView: createLazyPageObject(ExploratoryViewPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
