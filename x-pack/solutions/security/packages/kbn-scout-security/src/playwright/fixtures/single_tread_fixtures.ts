/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout';
import { securityBrowserAuthFixture } from './test/browser_auth';
import { extendPageObjects } from '../page_objects';
import { SecurityTestFixtures, SecurityWorkerFixtures } from './types';

/**
 * Should be used for the test spec files executed seqentially.
 */
export const test = base.extend<SecurityTestFixtures, SecurityWorkerFixtures>({
  ...securityBrowserAuthFixture,
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SecurityTestFixtures['pageObjects'];
      page: SecurityTestFixtures['page'];
    },
    use: (pageObjects: SecurityTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
