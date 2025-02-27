/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { test as base, ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { mergeTests } from 'playwright/test';
import { onboardingApiFixture, OnboardingApiFixture } from './onboarding_api';

export type ExtendedScoutTestFixtures = ObltTestFixtures;
export interface ExtendedScoutWorkerFixtures extends ObltWorkerFixtures {
  onboardingApi: OnboardingApiFixture;
}

const testFixtures = mergeTests(base, onboardingApiFixture);

export const test = testFixtures.extend<ExtendedScoutTestFixtures, ExtendedScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
    };

    await use(extendedPageObjects);
  },
});

export const generateIntegrationName = (name: string) => `${name}_${uuidv4().slice(0, 5)}`;

export * as assertionMessages from './assertion_messages';
