/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as baseSpaceTest } from '@kbn/scout-security';
import type {
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
} from '@kbn/scout-security';
import { extendDWPageObjects } from './page_objects';
import type { DefendWorkflowsPageObjects } from './page_objects';
import {
  createWorkerFixtures,
  type EndpointDataFixture,
  type EndpointPolicyFixture,
  type EndpointHostFixture,
} from './worker_fixtures';

export { DEFEND_WORKFLOWS_ROUTES, DEFEND_WORKFLOWS_PAGE_SUBJS } from './constants';

export type {
  EndpointDataFixture,
  EndpointPolicyFixture,
  EndpointHostFixture,
} from './worker_fixtures';

export interface DWParallelTestFixtures extends SecurityParallelTestFixtures {
  pageObjects: DefendWorkflowsPageObjects;
}

export interface DWParallelWorkerFixtures extends SecurityParallelWorkerFixtures {
  endpointData: EndpointDataFixture;
  endpointPolicy: EndpointPolicyFixture;
  endpointHost: EndpointHostFixture;
}

const workerFixtures = createWorkerFixtures();

export const spaceTest = baseSpaceTest.extend<
  DWParallelTestFixtures,
  DWParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: DWParallelTestFixtures['pageObjects'];
      page: DWParallelTestFixtures['page'];
    },
    use: (po: DWParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use(extendDWPageObjects(pageObjects, page));
  },

  endpointData: workerFixtures.endpointData,
  endpointPolicy: workerFixtures.endpointPolicy,
  endpointHost: workerFixtures.endpointHost,
});
