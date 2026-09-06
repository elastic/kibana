/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as baseSpaceTest, tags } from '@kbn/scout-security';
import type {
  ScoutPage,
  SecurityPageObjects,
  SecurityParallelTestFixtures,
} from '@kbn/scout-security';
import type { PolicyData } from '../../../../../common/endpoint/types';
import {
  createScoutEndpointPolicy,
  deleteScoutEndpointPolicy,
  getCreatedPackagePolicy,
} from './endpoint_policy';
import { extendPageObjects } from './page_objects';
import type { ArtifactTabPageObjects } from './page_objects';

export type { PolicyArtifactKind } from './page_objects';

export interface ArtifactTabTestFixtures extends SecurityParallelTestFixtures {
  pageObjects: ArtifactTabPageObjects;
}

export interface ArtifactTabWorkerFixtures {
  endpointPolicy: PolicyData;
}

/**
 * Playwright worker fixtures always have their own timeout slot. When this
 * option is omitted, the slot is Scout's project `timeout` (60000ms) and the
 * error is `Fixture "endpointPolicy" timeout of 60000ms exceeded during setup`.
 * A numeric literal here is the form Playwright copies onto the registration
 * (`value[1].timeout`); `test.setTimeout` / `describe.configure` do not change
 * worker-fixture setup time.
 *
 * Keep this under the test timeout only if setup is fast. If setup still fails,
 * this number must appear in the error (proving the option was applied).
 */
const ENDPOINT_POLICY_FIXTURE_TIMEOUT_MS = 300_000;

/**
 * One endpoint package policy per Playwright worker, created in that worker's
 * Scout space. Artifact lists stay agnostic (cluster-wide); files isolate by
 * owning a single list id.
 *
 * Do not call `scoutSpace.savedObjects.cleanStandardList()` from a spec
 * `afterAll`: that list includes ingest agent/package policies, and a worker
 * reuses this fixture across files.
 */
export const spaceTest = baseSpaceTest.extend<ArtifactTabTestFixtures, ArtifactTabWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (pageObjects: ArtifactTabPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
  endpointPolicy: [
    async ({ kbnClient, scoutSpace, log }, use) => {
      const indexed = await createScoutEndpointPolicy(
        kbnClient,
        log,
        `Scout artifact tabs ${scoutSpace.id}`,
        scoutSpace.id
      );
      await use(getCreatedPackagePolicy(indexed));
      await deleteScoutEndpointPolicy(kbnClient, log, indexed, scoutSpace.id);
    },
    { scope: 'worker', timeout: ENDPOINT_POLICY_FIXTURE_TIMEOUT_MS },
  ],
});

export { tags };
