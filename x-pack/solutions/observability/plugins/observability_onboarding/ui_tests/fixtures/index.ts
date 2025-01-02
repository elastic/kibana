/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  test as base,
  PageObjects,
  createLazyPageObject,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
  KibanaUrl,
  KbnClient,
} from '@kbn/scout';
import { OnboardingHomePage } from './page_objects';
import { CustomLogsPage } from './page_objects/custom_logs';

export interface ExtendedScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    onboardingHomePage: OnboardingHomePage;
    customLogsPage: CustomLogsPage;
  };
}

export const test = base.extend<ExtendedScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
      kbnClient,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
      page: ExtendedScoutTestFixtures['page'];
      kbnUrl: KibanaUrl;
      kbnClient: KbnClient;
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      onboardingHomePage: createLazyPageObject(OnboardingHomePage, page),
      customLogsPage: createLazyPageObject(CustomLogsPage, page, kbnUrl, kbnClient),
    };

    await use(extendedPageObjects);
  },
});
