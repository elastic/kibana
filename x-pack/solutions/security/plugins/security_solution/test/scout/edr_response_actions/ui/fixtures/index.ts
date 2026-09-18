/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as spaceBaseTest, tags } from '@kbn/scout-security';
import type {
  ScoutPage,
  SecurityPageObjects,
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
} from '@kbn/scout-security';
import type { ResponseActionsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface ResponseActionsTestFixtures extends SecurityParallelTestFixtures {
  pageObjects: ResponseActionsPageObjects;
}

export const spaceTest = spaceBaseTest.extend<
  ResponseActionsTestFixtures,
  SecurityParallelWorkerFixtures
>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (pageObjects: ResponseActionsPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});

export { tags };
