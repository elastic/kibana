/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';
import { INVALID_TOKEN_MESSAGE, TEST_TIMEOUT_MS, UNINSTALLED_MESSAGE } from '../fixtures/constants';
import { waitForAgentOnPolicy } from '../fixtures/fleet_agent';
import { getElasticInstallState, uninstallAgent } from '../fixtures/host_agent_commands';

apiTest.describe(
  'Uninstall an agent enrolled on a policy without tamper protection',
  { tag: ['@local-stateful-classic'] },
  () => {
    apiTest.use({
      agentPolicyOptions: {
        namePrefix: 'tamper-disabled',
        firstProtected: false,
      },
    });

    apiTest(
      'uninstalls the agent without an uninstall token',
      async ({ apiClient, log, agentPolicies, enrolledHost, requestHeaders }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first: unprotectedPolicy } = agentPolicies;
        const { agentId, hostname } = enrolledHost;

        await apiTest.step('the agent applies the unprotected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, unprotectedPolicy, log);
        });

        await apiTest.step('an uninstall without a token uninstalls the agent', async () => {
          const { exitCode, output } = await uninstallAgent(log, hostname);

          expect(exitCode, output).toBe(0);
          expect(output).not.toContain(INVALID_TOKEN_MESSAGE);
          expect(output).toContain(UNINSTALLED_MESSAGE);
          expect(await getElasticInstallState(log, hostname)).toBe('absent');
        });
      }
    );
  }
);
