/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { apiTest } from '../fixtures';
import {
  unenrollAgent,
  waitForAgentOnPolicy,
  waitForAgentUnenrolled,
} from '../fixtures/fleet_agent';

const TEST_TIMEOUT_MS = 15 * 60 * 1000;

apiTest.describe(
  'Unenroll an agent from Fleet when tamper protection is disabled',
  { tag: ['@local-stateful-classic'] },
  () => {
    let requestHeaders: Record<string, string>;

    apiTest.use({
      agentPolicyOptions: {
        namePrefix: 'tamper-unenroll-disabled',
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
      'the agent acknowledges a Fleet unenroll',
      async ({ apiClient, agentPolicies, enrolledHost }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first: unprotectedPolicy } = agentPolicies;
        const { agentId } = enrolledHost;

        await apiTest.step('the agent applies the unprotected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, unprotectedPolicy);
        });

        await apiTest.step('unenroll the agent from Fleet', async () => {
          await unenrollAgent(apiClient, requestHeaders, agentId);
        });

        await apiTest.step('the agent acknowledges the unenroll', async () => {
          await waitForAgentUnenrolled(apiClient, requestHeaders, agentId);
        });
      }
    );
  }
);
