/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base, apiTest as apiBase } from '@kbn/scout';
import type { ApiServicesFixture } from '@kbn/scout';

import { extendPageObjects } from '../page_objects';
import type { SearchApiServicesFixture, SearchTestFixtures, SearchWorkerFixtures } from './types';

const baseFixture = base.extend<SearchTestFixtures, SearchWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SearchTestFixtures['pageObjects'];
      page: SearchTestFixtures['page'];
    },
    use: (pageObjects: SearchTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async (
      { apiServices }: { apiServices: ApiServicesFixture },
      use: (extendedApiServices: SearchApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as SearchApiServicesFixture;
      // extend with Search specific API services
      // extendedApiServices.<service_name> = getServiceApiHelper(kbnClient);

      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

const apiFixture = apiBase.extend<SearchApiServicesFixture>({
  apiServices: [
    async (
      { apiServices }: { apiServices: ApiServicesFixture },
      use: (extendedApiServices: SearchApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as SearchApiServicesFixture;
      // extend with Search specific API services
      // extendedApiServices.<service_name> = getServiceApiHelper(kbnClient);
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

/**
 * Should be used for the test spec files executed sequentially.
 */
export const test = baseFixture;
export const apiTest = apiFixture;
