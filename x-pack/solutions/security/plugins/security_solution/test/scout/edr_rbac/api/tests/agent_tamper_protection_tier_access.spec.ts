/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  agentPolicyRouteService,
  type GetAgentPoliciesResponse,
} from '@kbn/fleet-plugin/common';
import { PUBLIC_API_HEADERS, type ApiServicesFixture } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { setupFleetForEndpoint } from '../../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
  type IndexedFleetEndpointPolicyResponse,
} from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { getEndpointPackageInfo } from '../../../../../common/endpoint/utils/package';
import { apiTest, tags } from '../fixtures';

// Setup can install the Endpoint package on a cold project.
const SUITE_TIMEOUT_MS = 5 * 60 * 1000;

const deleteAgentPoliciesNamed = async (
  apiServices: ApiServicesFixture,
  name: string
): Promise<void> => {
  const { data } = await apiServices.fleet.agent_policies.get({
    kuery: `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.name:"${name}"`,
  });
  for (const { id } of (data as GetAgentPoliciesResponse).items) {
    await apiServices.fleet.agent_policies.delete(id);
  }
};

apiTest.describe(
  'Agent Tamper Protection on agent policies on Security Complete',
  { tag: tags.serverless.security.complete },
  () => {
    const setupPolicyName = `scout-atp-complete-${uuidv4()}`;
    let headers: Record<string, string>;
    let indexedPolicy: IndexedFleetEndpointPolicyResponse | undefined;
    const policyNames: string[] = [];

    const uniquePolicyName = (): string => {
      const name = `scout-atp-complete-${uuidv4()}`;
      policyNames.push(name);
      return name;
    };

    apiTest.beforeAll(async ({ kbnClient, log, requestAuth }) => {
      apiTest.setTimeout(SUITE_TIMEOUT_MS);
      const { apiKeyHeader } = await requestAuth.getApiKey('platform_engineer');
      headers = { ...PUBLIC_API_HEADERS, 'kbn-xsrf': 'scout', ...apiKeyHeader };

      await setupFleetForEndpoint(kbnClient, log);
      const { version } = await getEndpointPackageInfo(kbnClient);
      // Fleet keeps tamper protection only on agent policies that include Elastic Defend.
      indexedPolicy = await indexFleetEndpointPolicy(
        kbnClient,
        setupPolicyName,
        version,
        setupPolicyName,
        log
      );
    });

    // Looked up by name so a policy that a regressed create request stored is removed as well.
    apiTest.afterEach(async ({ apiServices }) => {
      for (const name of policyNames.splice(0)) {
        await deleteAgentPoliciesNamed(apiServices, name);
      }
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      if (indexedPolicy) {
        await deleteIndexedFleetEndpointPolicies(kbnClient, indexedPolicy);
        return;
      }
      // The loader creates the agent policy before the package policy, so a failed setup can leave it.
      await deleteAgentPoliciesNamed(apiServices, setupPolicyName);
    });

    apiTest(
      'allows enabling tamper protection on an agent policy with Elastic Defend',
      async ({ apiClient }) => {
        const [{ id, name }] = indexedPolicy?.agentPolicies ?? [];

        const response = await apiClient.put(agentPolicyRouteService.getUpdatePath(id), {
          headers,
          body: { name, namespace: 'default', is_protected: true },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.item.is_protected).toBe(true);
      }
    );

    apiTest(
      'creates an agent policy with tamper protection disabled when it is requested on create',
      async ({ apiClient }) => {
        const response = await apiClient.post(agentPolicyRouteService.getCreatePath(), {
          headers,
          body: {
            name: uniquePolicyName(),
            namespace: 'default',
            is_protected: true,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.item.is_protected).toBe(false);
      }
    );
  }
);
