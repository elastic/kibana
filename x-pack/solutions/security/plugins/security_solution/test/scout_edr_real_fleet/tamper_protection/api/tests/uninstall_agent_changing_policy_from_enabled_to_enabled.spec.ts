/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest, type ProtectedEndpointPolicy } from '../fixtures';
import { getUninstallToken, readAgent, reassignAgent } from '../fixtures/fleet_agent';
import { getElasticInstallState, uninstallAgent } from '../fixtures/host_agent_commands';

const AGENT_POLICY_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 15 * 60 * 1000;
const INVALID_TOKEN_MESSAGE = 'Invalid uninstall token';
const UNINSTALLED_MESSAGE = 'Elastic Agent has been uninstalled';

const waitForAgentOnPolicy = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentId: string,
  { agentPolicyId, revision }: ProtectedEndpointPolicy
): Promise<void> => {
  await expect
    .poll(
      async () => {
        const { statusCode, body } = await readAgent(apiClient, headers, agentId);
        if (statusCode !== 200) {
          return `status ${statusCode}: ${JSON.stringify(body)}`;
        }

        const { policy_id: policyId, policy_revision: policyRevision, status } = body.item;
        return {
          policyId,
          revisionApplied: (policyRevision ?? 0) >= revision,
          updating: status === 'updating',
        };
      },
      {
        message: `agent ${agentId} reports policy ${agentPolicyId} at revision ${revision} or later`,
        timeout: AGENT_POLICY_TIMEOUT_MS,
        intervals: [5_000],
      }
    )
    .toStrictEqual({ policyId: agentPolicyId, revisionApplied: true, updating: false });
};

apiTest.describe(
  'Uninstall an agent moved between two tamper protected policies',
  { tag: ['@local-stateful-classic'] },
  () => {
    let requestHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [{ base: [], feature: { fleetv2: ['all'] }, spaces: ['default'] }],
      });
      requestHeaders = {
        ...apiKeyHeader,
        ...PUBLIC_API_HEADERS,
        'kbn-xsrf': 'scout-edr-real-fleet',
        'Content-Type': 'application/json',
      };
    });

    apiTest(
      'rejects the previous policy uninstall token and accepts the new one',
      async ({ apiClient, log, protectedPolicies, enrolledHost }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first, second } = protectedPolicies;
        const { agentId, hostname } = enrolledHost;

        await apiTest.step('the agent applies the first protected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, first);
        });

        await apiTest.step('reassign the agent to the second protected policy', async () => {
          const response = await reassignAgent(
            apiClient,
            requestHeaders,
            agentId,
            second.agentPolicyId
          );
          expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, second);
        });

        await apiTest.step('the first policy uninstall token is rejected', async () => {
          const token = await getUninstallToken(apiClient, requestHeaders, first.agentPolicyId);
          const { exitCode, output } = await uninstallAgent(log, hostname, token);

          expect(exitCode, output).not.toBe(0);
          expect(output).toContain(INVALID_TOKEN_MESSAGE);
          expect(output).not.toContain(UNINSTALLED_MESSAGE);
          expect(await getElasticInstallState(log, hostname)).toBe('present');
        });

        await apiTest.step('the second policy uninstall token uninstalls the agent', async () => {
          const token = await getUninstallToken(apiClient, requestHeaders, second.agentPolicyId);
          const { exitCode, output } = await uninstallAgent(log, hostname, token);

          expect(exitCode, output).toBe(0);
          expect(output).not.toContain(INVALID_TOKEN_MESSAGE);
          expect(output).toContain(UNINSTALLED_MESSAGE);
          expect(await getElasticInstallState(log, hostname)).toBe('absent');
        });
      }
    );
  }
);
