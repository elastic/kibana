/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest, getReassignPolicy } from '../fixtures';
import { INVALID_TOKEN_MESSAGE, TEST_TIMEOUT_MS, UNINSTALLED_MESSAGE } from '../fixtures/constants';
import { getUninstallToken, reassignAgent, waitForAgentOnPolicy } from '../fixtures/fleet_agent';
import { getElasticInstallState, uninstallAgent } from '../fixtures/host_agent_commands';

apiTest.describe(
  'Uninstall an agent moved between two tamper protected policies',
  { tag: ['@local-stateful-classic'] },
  () => {
    apiTest(
      'rejects the previous policy uninstall token and accepts the new one',
      async ({ apiClient, log, agentPolicies, enrolledHost, requestHeaders }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first } = agentPolicies;
        const second = getReassignPolicy(agentPolicies);
        const { agentId, hostname } = enrolledHost;

        await apiTest.step('the agent applies the first protected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, first, log);
        });

        await apiTest.step('reassign the agent to the second protected policy', async () => {
          const response = await reassignAgent(
            apiClient,
            requestHeaders,
            agentId,
            second.agentPolicyId
          );
          expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, second, log);
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
