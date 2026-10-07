/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../common/constants';
import { ENDPOINT_ALERTS_INDEX } from '../../../../scripts/endpoint/common/constants';
import {
  countEndpointAlertsForAgent,
  deleteDetectionAlertsForAgent,
  getEndpointSecurityAlertsQuery,
  getSecurityRoleApiKey,
  restartEndpointSecurityRule,
  runCommandOnHost,
} from '../fixtures/endpoint_generated_alerts';
import { apiTest } from '../fixtures';

/** Matches an Elastic Defend malicious-behavior rule; the agent blocks it and raises an alert. */
const MALICIOUS_COMMAND = 'bash -c cat /dev/tcp/foo';
const ENDPOINT_ALERT_TIMEOUT_MS = 240_000;
const DETECTION_ALERT_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 2_000;
const TEST_TIMEOUT_MS = 12 * 60 * 1000;

interface AlertsSearchBody {
  hits: { total: { value: number } };
}

apiTest.describe(
  'Endpoint generated alerts',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    apiTest.afterEach(async ({ esClient, enrolledEndpoint }) => {
      await deleteDetectionAlertsForAgent(esClient, enrolledEndpoint.agentId);
    });

    apiTest(
      'promotes an alert from a live Endpoint to a Detection Engine alert',
      async ({ apiClient, config, esClient, kbnClient, log, requestAuth, enrolledEndpoint }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { agentId, hostname } = enrolledEndpoint;

        await apiTest.step('the Endpoint streams an alert for the malicious command', async () => {
          const { exitCode, stderr } = await runCommandOnHost(hostname, MALICIOUS_COMMAND);
          const triggerResult = `exit code ${exitCode}, stderr: ${stderr || '<empty>'}`;
          log.info(`[edr_real_fleet] ran [${MALICIOUS_COMMAND}] on ${hostname}: ${triggerResult}`);

          await expect
            .poll(() => countEndpointAlertsForAgent(esClient, agentId), {
              timeout: ENDPOINT_ALERT_TIMEOUT_MS,
              intervals: [POLL_INTERVAL_MS],
              message: `no Endpoint alert for agent ${agentId} in ${ENDPOINT_ALERTS_INDEX} (trigger: ${triggerResult})`,
            })
            .toBeGreaterThan(0);
        });

        await apiTest.step('the Endpoint Security rule promotes it', async () => {
          await restartEndpointSecurityRule(kbnClient);

          const { apiKeyHeader } = await getSecurityRoleApiKey(requestAuth, config, 'soc_manager');
          const headers = { ...apiKeyHeader, ...PUBLIC_API_HEADERS, 'kbn-xsrf': 'true' };

          await expect
            .poll(
              async () => {
                const response = await apiClient.post(DETECTION_ENGINE_QUERY_SIGNALS_URL, {
                  headers,
                  responseType: 'json',
                  body: {
                    query: getEndpointSecurityAlertsQuery(agentId),
                    size: 0,
                    track_total_hits: true,
                  },
                });
                expect(response).toHaveStatusCode(200);
                return (response.body as AlertsSearchBody).hits.total.value;
              },
              {
                timeout: DETECTION_ALERT_TIMEOUT_MS,
                intervals: [POLL_INTERVAL_MS],
                message: `no Endpoint Security Detection Engine alert for agent ${agentId}`,
              }
            )
            .toBeGreaterThan(0);
        });
      }
    );
  }
);
