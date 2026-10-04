/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test as baseTest } from '@kbn/scout-security';
import type {
  ScoutPage,
  SecurityPageObjects,
  SecurityTestFixtures,
  SecurityWorkerFixtures,
} from '@kbn/scout-security';
import {
  enrollEndpointHost,
  FLEET_AND_HOST_TIMEOUT_MS,
  type EnrolledEndpoint,
} from '../../fixtures/enroll_endpoint';
import type { EdrRealFleetPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export { tags };
export type { EnrolledEndpoint };

export interface EdrRealFleetTestFixtures extends SecurityTestFixtures {
  pageObjects: EdrRealFleetPageObjects;
}

export interface EdrRealFleetWorkerFixtures extends SecurityWorkerFixtures {
  enrolledEndpoint: EnrolledEndpoint;
}

export const test = baseTest.extend<EdrRealFleetTestFixtures, EdrRealFleetWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (pageObjects: EdrRealFleetPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },

  enrolledEndpoint: [
    async ({ kbnClient, esClient, log }, use) => {
      await enrollEndpointHost(
        {
          kbnClient,
          esClient,
          log,
          policyNamePrefix: 'automated-response-actions',
          hostnamePrefix: 'test-host-ara',
        },
        use
      );
    },
    { scope: 'worker', timeout: FLEET_AND_HOST_TIMEOUT_MS },
  ],
});
