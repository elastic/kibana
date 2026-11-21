/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';
import { waitForAgentOnPolicy } from '../fixtures/fleet_agent';
import { getElasticInstallState, uninstallAgent } from '../fixtures/host_agent_commands';

const TEST_TIMEOUT_MS = 15 * 60 * 1000;
const INVALID_TOKEN_MESSAGE = 'Invalid uninstall token';
const UNINSTALLED_MESSAGE = 'Elastic Agent has been uninstalled';

apiTest.describe(
  'Uninstall an agent enrolled on a policy without tamper protection',
  { tag: ['@local-stateful-classic'] },
  () => {
    let requestHeaders: Record<string, string>;

    // `agentPolicies` always creates two policies; this test only uses the one the host enrolls on.
    apiTest.use({
      agentPolicyOptions: {
        namePrefix: 'tamper-disabled',
        firstProtected: false,
        secondProtected: false,
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
      'uninstalls the agent without an uninstall token',
      async ({ apiClient, log, agentPolicies, enrolledHost }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first: unprotectedPolicy } = agentPolicies;
        const { agentId, hostname } = enrolledHost;

        await apiTest.step('the agent applies the unprotected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, unprotectedPolicy);
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
