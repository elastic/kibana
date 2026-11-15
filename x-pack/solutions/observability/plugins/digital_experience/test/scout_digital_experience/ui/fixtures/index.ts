/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { test as baseTest, createLazyPageObject } from '@kbn/scout-oblt';
import { DigitalExperiencePage } from './page_objects';

export interface DigitalExperienceTestFixtures {
  pageObjects: ObltTestFixtures['pageObjects'] & {
    digitalExperience: DigitalExperiencePage;
  };
}

export const test = baseTest.extend<DigitalExperienceTestFixtures>({
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
    use: (pageObjects: DigitalExperienceTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      digitalExperience: createLazyPageObject(DigitalExperiencePage, page, kbnUrl),
    });
  },
});

export * as testData from './constants';
