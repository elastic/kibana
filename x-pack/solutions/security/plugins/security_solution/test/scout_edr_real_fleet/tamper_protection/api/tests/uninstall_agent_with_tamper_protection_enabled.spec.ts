/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';
import { INVALID_TOKEN_MESSAGE, TEST_TIMEOUT_MS, UNINSTALLED_MESSAGE } from '../fixtures/constants';
import { getUninstallToken, waitForAgentOnPolicy } from '../fixtures/fleet_agent';
import { getElasticInstallState, uninstallAgent } from '../fixtures/host_agent_commands';

apiTest.describe(
  'Uninstall an agent enrolled on a tamper protected policy',
  { tag: ['@local-stateful-classic'] },
  () => {
    apiTest.use({
      agentPolicyOptions: {
        namePrefix: 'tamper-enabled',
        firstProtected: true,
      },
    });

    apiTest(
      'rejects an uninstall without a token and accepts the policy uninstall token',
      async ({ apiClient, log, agentPolicies, enrolledHost, requestHeaders }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first: protectedPolicy } = agentPolicies;
        const { agentId, hostname } = enrolledHost;

        await apiTest.step('the agent applies the protected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, protectedPolicy, log);
        });

        await apiTest.step('an uninstall without a token is rejected', async () => {
          const { exitCode, output } = await uninstallAgent(log, hostname);

          expect(exitCode, output).not.toBe(0);
          expect(output).toContain(INVALID_TOKEN_MESSAGE);
          expect(output).not.toContain(UNINSTALLED_MESSAGE);
          expect(await getElasticInstallState(log, hostname)).toBe('present');
        });

        await apiTest.step('the policy uninstall token uninstalls the agent', async () => {
          const token = await getUninstallToken(
            apiClient,
            requestHeaders,
            protectedPolicy.agentPolicyId
          );
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
