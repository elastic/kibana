/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ScoutPage,
  test as baseTest,
  ObltTestFixtures,
  ObltWorkerFixtures,
  ScoutTestConfig,
} from '@kbn/scout-oblt';
import { SLOPageObjects, extendPageObjects } from './page_objects';

export interface StreamsTestFixtures extends ObltTestFixtures {
  pageObjects: SLOPageObjects;
}

export const test = baseTest.extend<StreamsTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      config,
    }: {
      pageObjects: SLOPageObjects;
      page: ScoutPage;
      config: ScoutTestConfig;
    },
    use: (pageObjects: SLOPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page, config);
    await use(extendedPageObjects);
  },
});
