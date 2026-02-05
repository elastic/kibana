/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as spaceBase } from '@kbn/scout';
import type { ApiServicesFixture } from '@kbn/scout';
import { extendPageObjects } from '../page_objects';

import type {
  SearchApiServicesFixture,
  SearchParallelTestFixtures,
  SearchParallelWorkerFixtures,
} from './types';

const baseFixture = spaceBase.extend<SearchParallelTestFixtures, SearchParallelWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SearchParallelTestFixtures['pageObjects'];
      page: SearchParallelTestFixtures['page'];
    },
    use: (pageObjects: SearchParallelTestFixtures['pageObjects']) => Promise<void>
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

/**
 * Should be used test spec files, running in parallel in isolated spaces against the same Kibana instance.
 */
export const spaceTest = baseFixture;
