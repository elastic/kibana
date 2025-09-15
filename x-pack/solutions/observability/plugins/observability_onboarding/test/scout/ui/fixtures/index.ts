/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { test as base } from '@kbn/scout-oblt';
import type {
  KbnClient,
  ObltApiServicesFixture,
  ObltTestFixtures,
  ObltWorkerFixtures,
  ScoutPage,
} from '@kbn/scout-oblt';
import type { OnboardingApiService } from './apis/onboarding';
import { getOnboardingApiHelper } from './apis/onboarding';
import type { OnboardingPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface ExtendedScoutTestFixtures extends ObltTestFixtures {
  pageObjects: OnboardingPageObjects;
}

export interface ExtendedApiServicesFixture extends ObltApiServicesFixture {
  onboarding: OnboardingApiService;
}
export interface ExtendedScoutWorkerFixtures extends ObltWorkerFixtures {
  apiServices: ExtendedApiServicesFixture;
}

export const test = base.extend<ExtendedScoutTestFixtures, ExtendedScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: OnboardingPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: OnboardingPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async (
      { apiServices, kbnClient }: { apiServices: ObltApiServicesFixture; kbnClient: KbnClient },
      use: (extendedApiServices: ExtendedApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as ExtendedApiServicesFixture;
      extendedApiServices.onboarding = getOnboardingApiHelper(kbnClient);

      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

export const generateIntegrationName = (name: string) => `${name}_${uuidv4().slice(0, 5)}`;
