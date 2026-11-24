/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';
import { getUninstallToken, reassignAgent, waitForAgentOnPolicy } from '../fixtures/fleet_agent';
import { getElasticInstallState, uninstallAgent } from '../fixtures/host_agent_commands';

const TEST_TIMEOUT_MS = 15 * 60 * 1000;
const INVALID_TOKEN_MESSAGE = 'Invalid uninstall token';
const UNINSTALLED_MESSAGE = 'Elastic Agent has been uninstalled';

apiTest.describe(
  'Uninstall an agent moved from an unprotected to a tamper protected policy',
  { tag: ['@local-stateful-classic'] },
  () => {
    let requestHeaders: Record<string, string>;

    apiTest.use({
      agentPolicyOptions: {
        namePrefix: 'tamper-disabled-to-enabled',
        firstProtected: false,
        secondProtected: true,
      },
    });

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
      'rejects an uninstall without a token and accepts the protected policy token',
      async ({ apiClient, log, agentPolicies, enrolledHost }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first: unprotectedPolicy, second: protectedPolicy } = agentPolicies;
        const { agentId, hostname } = enrolledHost;

        await apiTest.step('the agent applies the unprotected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, unprotectedPolicy);
        });

        await apiTest.step('reassign the agent to the protected policy', async () => {
          const response = await reassignAgent(
            apiClient,
            requestHeaders,
            agentId,
            protectedPolicy.agentPolicyId
          );
          expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, protectedPolicy);
        });

        await apiTest.step('an uninstall without a token is rejected', async () => {
          const { exitCode, output } = await uninstallAgent(log, hostname);

          expect(exitCode, output).not.toBe(0);
          expect(output).toContain(INVALID_TOKEN_MESSAGE);
          expect(output).not.toContain(UNINSTALLED_MESSAGE);
          expect(await getElasticInstallState(log, hostname)).toBe('present');
        });

        await apiTest.step(
          'the protected policy uninstall token uninstalls the agent',
          async () => {
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
          }
        );
      }
    );
  }
);
