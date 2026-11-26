/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTests, spaceTest as baseSpaceTest, tags } from '@kbn/scout-security';
import type {
  ScoutPage,
  SecurityPageObjects,
  SecurityParallelTestFixtures,
  SecurityParallelWorkerFixtures,
} from '@kbn/scout-security';
import { securitySolutionApiFixture } from '@kbn/security-solution-test-api-clients/scout';
import type { SecuritySolutionApiFixtures } from '@kbn/security-solution-test-api-clients/scout';
import type { PolicyData } from '../../../../../common/endpoint/types';
import {
  createScoutEndpointPolicy,
  deleteScoutEndpointPolicy,
  getCreatedPackagePolicy,
} from '../../../edr_artifacts/ui/fixtures/endpoint_policy';
import { extendPageObjects } from './page_objects';
import type { PolicyPageObjects } from './page_objects';

export interface PolicyTestFixtures extends SecurityParallelTestFixtures {
  pageObjects: PolicyPageObjects;
  /** An endpoint package policy created in the worker space for this test only. */
  endpointPolicy: PolicyData;
}

/**
 * Creating an agent policy and an endpoint package policy takes longer than the default fixture
 * slot under two workers; the literal gives the fixture its own slot, apart from the test timeout.
 */
const ENDPOINT_POLICY_FIXTURE_TIMEOUT_MS = 300_000;

export const spaceTest = mergeTests(baseSpaceTest, securitySolutionApiFixture).extend<
  PolicyTestFixtures,
  SecurityParallelWorkerFixtures & SecuritySolutionApiFixtures
>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (pageObjects: PolicyPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
  endpointPolicy: [
    async ({ kbnClient, scoutSpace, log }, use) => {
      // This fixture has its own timeout slot, which fits KbnClient's default retries.
      const requestOptions = { retryRequests: true };
      const indexed = await createScoutEndpointPolicy(
        kbnClient,
        log,
        `Scout policy ${scoutSpace.id} ${Date.now()}`,
        scoutSpace.id,
        requestOptions
      );
      await use(getCreatedPackagePolicy(indexed));
      // Fleet's post-delete callback also removes the policy's protection updates note.
      await deleteScoutEndpointPolicy(kbnClient, log, indexed, scoutSpace.id, requestOptions);
    },
    { timeout: ENDPOINT_POLICY_FIXTURE_TIMEOUT_MS },
  ],
});

export { tags };
