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
  type CreateAgentPolicyResponse,
  type GetAgentPoliciesResponse,
} from '@kbn/fleet-plugin/common';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest, tags } from '../fixtures';

const NOT_ALLOWED_MESSAGE = 'Agent Tamper Protection is not allowed in current environment';

apiTest.describe(
  'Agent Tamper Protection on agent policies on Security Essentials',
  { tag: tags.serverless.security.essentials },
  () => {
    let headers: Record<string, string>;
    const policyNames: string[] = [];

    const uniquePolicyName = (): string => {
      const name = `scout-atp-essentials-${uuidv4()}`;
      policyNames.push(name);
      return name;
    };

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('platform_engineer');
      headers = { ...PUBLIC_API_HEADERS, 'kbn-xsrf': 'scout', ...apiKeyHeader };
    });

    // Looked up by name so a policy that a regressed create request stored is removed as well.
    apiTest.afterEach(async ({ apiServices }) => {
      for (const name of policyNames.splice(0)) {
        const { data } = await apiServices.fleet.agent_policies.get({
          kuery: `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.name:"${name}"`,
        });
        for (const { id } of (data as GetAgentPoliciesResponse).items) {
          await apiServices.fleet.agent_policies.delete(id);
        }
      }
    });

    apiTest(
      'rejects enabling tamper protection on an existing agent policy',
      async ({ apiClient, apiServices }) => {
        const name = uniquePolicyName();
        const { data } = await apiServices.fleet.agent_policies.create({
          policyName: name,
          policyNamespace: 'default',
        });
        const { id } = (data as CreateAgentPolicyResponse).item;

        const response = await apiClient.put(agentPolicyRouteService.getUpdatePath(id), {
          headers,
          body: { name, namespace: 'default', is_protected: true },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toBe(NOT_ALLOWED_MESSAGE);
      }
    );

    apiTest(
      'rejects creating an agent policy with tamper protection enabled',
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

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toBe(NOT_ALLOWED_MESSAGE);
      }
    );
  }
);
