/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, spaceTest as spaceBase, createLazyPageObject } from '@kbn/scout';
import {
  VectordbOnboardingPage,
  VectordbHomePage,
  VectordbTutorialsPage,
  VectordbNavigation,
} from './page_objects';

export interface ExtScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    vectordbOnboarding: VectordbOnboardingPage;
    vectordbHome: VectordbHomePage;
    vectordbTutorials: VectordbTutorialsPage;
    vectordbNavigation: VectordbNavigation;
  };
}

export interface ExtScoutParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: ScoutParallelTestFixtures['pageObjects'] & {
    vectordbOnboarding: VectordbOnboardingPage;
    vectordbHome: VectordbHomePage;
    vectordbTutorials: VectordbTutorialsPage;
    vectordbNavigation: VectordbNavigation;
  };
}

export const test = baseTest.extend<ExtScoutTestFixtures, ScoutWorkerFixtures>({
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
      vectordbOnboarding: createLazyPageObject(VectordbOnboardingPage, page),
      vectordbHome: createLazyPageObject(VectordbHomePage, page),
      vectordbTutorials: createLazyPageObject(VectordbTutorialsPage, page),
      vectordbNavigation: createLazyPageObject(VectordbNavigation, page),
    };

    await use(extendedPageObjects);
  },
});

export const spaceTest = spaceBase.extend<
  ExtScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtScoutParallelTestFixtures['pageObjects'];
      page: ExtScoutParallelTestFixtures['page'];
    },
    use: (pageObjects: ExtScoutParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      vectordbOnboarding: createLazyPageObject(VectordbOnboardingPage, page),
      vectordbHome: createLazyPageObject(VectordbHomePage, page),
      vectordbTutorials: createLazyPageObject(VectordbTutorialsPage, page),
      vectordbNavigation: createLazyPageObject(VectordbNavigation, page),
    };

    await use(extendedPageObjects);
  },
});
