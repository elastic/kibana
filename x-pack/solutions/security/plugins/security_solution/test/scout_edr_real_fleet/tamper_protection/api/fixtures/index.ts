/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '@kbn/scout-security';
import {
  FLEET_AND_HOST_TIMEOUT_MS,
  withEnrolledHost,
  withFleetServerForEndpoint,
  type EnrolledHost,
} from '../../../fixtures/enrolled_endpoint';
import {
  createProtectedEndpointPolicy,
  deleteProtectedEndpointPolicy,
  type ProtectedEndpointPolicy,
} from './protected_policy';

const PROTECTED_POLICIES_TIMEOUT_MS = 180_000;

export type { EnrolledHost, ProtectedEndpointPolicy };

export interface ProtectedPolicies {
  /** The policy the host enrolls on. */
  first: ProtectedEndpointPolicy;
  /** The policy the host is reassigned to. */
  second: ProtectedEndpointPolicy;
}

interface TamperProtectionTestFixtures {
  protectedPolicies: ProtectedPolicies;
  enrolledHost: EnrolledHost;
}

interface TamperProtectionWorkerFixtures {
  fleetServer: void;
}

export const apiTest = baseApiTest.extend<
  TamperProtectionTestFixtures,
  TamperProtectionWorkerFixtures
>({
  fleetServer: [
    async ({ kbnClient, log }, use) => {
      await withFleetServerForEndpoint({ kbnClient, log }, use);
    },
    { scope: 'worker', timeout: FLEET_AND_HOST_TIMEOUT_MS },
  ],

  // Depends on `fleetServer` because the Endpoint package must be installed first.
  protectedPolicies: [
    async ({ kbnClient, log, fleetServer }, use) => {
      const suffix = Date.now();
      const created: Partial<ProtectedPolicies> = {};

      try {
        created.first = await createProtectedEndpointPolicy(
          kbnClient,
          log,
          `tamper-enabled-to-enabled-a-${suffix}`
        );
        created.second = await createProtectedEndpointPolicy(
          kbnClient,
          log,
          `tamper-enabled-to-enabled-b-${suffix}`
        );

        await use({ first: created.first, second: created.second });
      } finally {
        for (const policy of [created.first, created.second]) {
          if (policy) {
            await deleteProtectedEndpointPolicy(kbnClient, log, policy.indexedPolicy);
          }
        }
      }
    },
    { timeout: PROTECTED_POLICIES_TIMEOUT_MS },
  ],

  enrolledHost: [
    async ({ kbnClient, esClient, log, protectedPolicies }, use) => {
      await withEnrolledHost(
        {
          kbnClient,
          esClient,
          log,
          agentPolicyId: protectedPolicies.first.agentPolicyId,
          hostnamePrefix: 'test-host-tamper-',
        },
        use
      );
    },
    { timeout: FLEET_AND_HOST_TIMEOUT_MS },
  ],
});
