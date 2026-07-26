/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BrowserAuthFixture,
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout-search';
import { test as base, spaceTest as spaceBase, createLazyPageObject } from '@kbn/scout-search';
import { Homepage } from './page_objects/homepage';

export interface ExtendedScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    homepage: Homepage;
  };
  browserAuth: BrowserAuthFixture;
}

export interface ExtendedScoutParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: ScoutParallelTestFixtures['pageObjects'] & {
    homepage: Homepage;
  };
}

export const test = base.extend<ExtendedScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
      page: ExtendedScoutTestFixtures['page'];
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      homepage: createLazyPageObject(Homepage, page),
    };
    await use(extendedPageObjects);
  },
});

export const spaceTest = spaceBase.extend<
  ExtendedScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtendedScoutParallelTestFixtures['pageObjects'];
      page: ExtendedScoutParallelTestFixtures['page'];
    },
    use: (pageObjects: ExtendedScoutParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      homepage: createLazyPageObject(Homepage, page),
    };
    await use(extendedPageObjects);
  },
});
