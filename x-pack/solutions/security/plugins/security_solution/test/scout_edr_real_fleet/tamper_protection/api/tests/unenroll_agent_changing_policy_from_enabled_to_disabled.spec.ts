/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest, getReassignPolicy } from '../fixtures';
import { TEST_TIMEOUT_MS } from '../fixtures/constants';
import {
  reassignAgent,
  unenrollAgent,
  waitForAgentOnPolicy,
  waitForAgentUnenrolled,
} from '../fixtures/fleet_agent';

apiTest.describe(
  'Unenroll an agent from Fleet after moving it from a tamper protected to an unprotected policy',
  { tag: ['@local-stateful-classic'] },
  () => {
    apiTest.use({
      agentPolicyOptions: {
        namePrefix: 'tamper-unenroll-enabled-to-disabled',
        firstProtected: true,
        secondProtected: false,
      },
    });

    apiTest(
      'the agent acknowledges a Fleet unenroll once it is on the unprotected policy',
      async ({ apiClient, log, agentPolicies, enrolledHost, requestHeaders }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { first: protectedPolicy } = agentPolicies;
        const unprotectedPolicy = getReassignPolicy(agentPolicies);
        const { agentId } = enrolledHost;

        await apiTest.step('the agent applies the protected policy', async () => {
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, protectedPolicy, log);
        });

        await apiTest.step('reassign the agent to the unprotected policy', async () => {
          const response = await reassignAgent(
            apiClient,
            requestHeaders,
            agentId,
            unprotectedPolicy.agentPolicyId
          );
          expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
          await waitForAgentOnPolicy(apiClient, requestHeaders, agentId, unprotectedPolicy, log);
        });

        await apiTest.step('unenroll the agent from Fleet', async () => {
          const response = await unenrollAgent(apiClient, requestHeaders, agentId);
          expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        });

        await apiTest.step('the agent acknowledges the unenroll', async () => {
          await waitForAgentUnenrolled(apiClient, requestHeaders, agentId);
        });
      }
    );
  }
);
