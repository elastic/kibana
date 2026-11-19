/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout-security';
import { apiTest as baseApiTest } from '@kbn/scout-security';
import {
  FLEET_AND_HOST_TIMEOUT_MS,
  withEnrolledHost,
  withFleetServerForEndpoint,
  type EnrolledHost,
} from '../../../fixtures/enrolled_endpoint';
import {
  createProtectedEndpointPolicy,
  createUnprotectedEndpointPolicy,
  deleteEndpointAgentPolicy,
  type EndpointAgentPolicy,
} from './protected_policy';

const AGENT_POLICIES_TIMEOUT_MS = 180_000;

export type { EnrolledHost, EndpointAgentPolicy };

export interface EndpointAgentPolicies {
  /** The policy the host enrolls on. */
  first: EndpointAgentPolicy;
  /** The policy the host is reassigned to. */
  second: EndpointAgentPolicy;
}

interface AgentPolicyOptions {
  /** Policies are named `<namePrefix>-a-<timestamp>` and `<namePrefix>-b-<timestamp>`. */
  namePrefix: string;
  firstProtected: boolean;
  secondProtected: boolean;
}

interface TamperProtectionTestFixtures {
  agentPolicyOptions: AgentPolicyOptions;
  agentPolicies: EndpointAgentPolicies;
  enrolledHost: EnrolledHost;
}

interface TamperProtectionWorkerFixtures {
  fleetServer: void;
}

const createAgentPolicy = (
  kbnClient: KbnClient,
  log: ScoutLogger,
  name: string,
  isProtected: boolean
): Promise<EndpointAgentPolicy> =>
  isProtected
    ? createProtectedEndpointPolicy(kbnClient, log, name)
    : createUnprotectedEndpointPolicy(kbnClient, log, name);

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

  agentPolicyOptions: [
    { namePrefix: 'tamper-enabled-to-enabled', firstProtected: true, secondProtected: true },
    { option: true },
  ],

  // Depends on `fleetServer` because the Endpoint package must be installed first.
  agentPolicies: [
    async ({ kbnClient, log, agentPolicyOptions, fleetServer: _fleetServer }, use) => {
      const { namePrefix, firstProtected, secondProtected } = agentPolicyOptions;
      const suffix = Date.now();
      const created: Partial<EndpointAgentPolicies> = {};

      try {
        created.first = await createAgentPolicy(
          kbnClient,
          log,
          `${namePrefix}-a-${suffix}`,
          firstProtected
        );
        created.second = await createAgentPolicy(
          kbnClient,
          log,
          `${namePrefix}-b-${suffix}`,
          secondProtected
        );

        await use({ first: created.first, second: created.second });
      } finally {
        for (const policy of [created.first, created.second]) {
          if (policy) {
            await deleteEndpointAgentPolicy(kbnClient, log, policy.indexedPolicy);
          }
        }
      }
    },
    { timeout: AGENT_POLICIES_TIMEOUT_MS },
  ],

  enrolledHost: [
    async ({ kbnClient, esClient, log, agentPolicies }, use) => {
      await withEnrolledHost(
        {
          kbnClient,
          esClient,
          log,
          agentPolicyId: agentPolicies.first.agentPolicyId,
          hostnamePrefix: 'test-host-tamper-',
        },
        use
      );
    },
    { timeout: FLEET_AND_HOST_TIMEOUT_MS },
  ],
});
