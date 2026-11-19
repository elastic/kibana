/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';
import { unenrollAgent, waitForAgentUnenrolled } from '../fixtures/fleet_agent';

const TEST_TIMEOUT_MS = 15 * 60 * 1000;

apiTest.describe(
  'Unenroll an agent from Fleet when tamper protection is enabled',
  { tag: ['@local-stateful-classic'] },
  () => {
    let requestHeaders: Record<string, string>;

    apiTest.use({
      agentPolicyOptions: {
        namePrefix: 'tamper-unenroll-enabled',
        firstProtected: true,
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

    apiTest('the agent acknowledges a Fleet unenroll', async ({ apiClient, enrolledHost }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      const { agentId } = enrolledHost;

      await apiTest.step('unenroll the agent from Fleet', async () => {
        const response = await unenrollAgent(apiClient, requestHeaders, agentId);
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      });

      await apiTest.step('the agent acknowledges the unenroll', async () => {
        await waitForAgentUnenrolled(apiClient, requestHeaders, agentId);
      });
    });
  }
);
