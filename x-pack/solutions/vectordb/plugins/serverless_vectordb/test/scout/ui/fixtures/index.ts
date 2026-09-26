/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutParallelTestFixtures, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { spaceTest as spaceBase, createLazyPageObject } from '@kbn/scout';
import { VectordbHomePage, OnboardingPage } from './page_objects';

export interface VectordbParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: ScoutParallelTestFixtures['pageObjects'] & {
    vectordbHome: VectordbHomePage;
    onboarding: OnboardingPage;
  };
}

export const spaceTest = spaceBase.extend<
  VectordbParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: VectordbParallelTestFixtures['pageObjects'];
      page: VectordbParallelTestFixtures['page'];
    },
    use: (pageObjects: VectordbParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      vectordbHome: createLazyPageObject(VectordbHomePage, page),
      onboarding: createLazyPageObject(OnboardingPage, page),
    });
  },
});

export { seedReturningUser } from './browser_state';
export { mockDeploymentStats } from './mocks';
