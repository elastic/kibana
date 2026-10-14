/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as spaceBaseTest } from '@kbn/scout-security';
import type {
  KbnClient,
  ScoutPage,
  ScoutParallelWorkerFixtures,
  SecurityApiServicesFixture,
  SecurityPageObjects,
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
} from '@kbn/scout-security';
import type { WorkflowStepPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';
import { ExceptionStepTestApi } from '../common/exception_step_test_api';

export interface ExceptionStepApiServicesFixture extends SecurityApiServicesFixture {
  exceptionStep: ExceptionStepTestApi;
}

export interface ExceptionStepTestFixtures extends SecurityParallelTestFixtures {
  pageObjects: WorkflowStepPageObjects;
}

export interface ExceptionStepWorkerFixtures extends SecurityParallelWorkerFixtures {
  apiServices: ExceptionStepApiServicesFixture;
}

export const spaceTest = spaceBaseTest.extend<
  ExceptionStepTestFixtures,
  ExceptionStepWorkerFixtures
>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (pageObjects: WorkflowStepPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        scoutSpace,
      }: {
        apiServices: SecurityApiServicesFixture;
        kbnClient: KbnClient;
        scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'];
      },
      use: (extendedApiServices: ExceptionStepApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as ExceptionStepApiServicesFixture;
      extendedApiServices.exceptionStep = new ExceptionStepTestApi(scoutSpace.id, kbnClient);
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

export { tags } from '@kbn/scout-security';
export { expect } from '@kbn/scout-security/ui';
