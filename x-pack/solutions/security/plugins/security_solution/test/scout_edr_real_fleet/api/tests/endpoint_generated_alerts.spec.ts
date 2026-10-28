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
  countEndpointAlertsForFile,
  deleteEndpointSecurityAlerts,
  getEndpointSecurityAlertsQuery,
  getSecurityRoleApiKey,
  restartEndpointSecurityRule,
  runCommandOnHost,
} from '../fixtures/endpoint_generated_alerts';
import { apiTest } from '../fixtures';

const EICAR_FILE_NAME = 'eicar.com.txt';
const EICAR_URL = `https://secure.eicar.org/${EICAR_FILE_NAME}`;
/**
 * Write the EICAR test file to the VM user's home directory and make it executable.
 * Each command runs on its own because the host may have no shell.
 */
const EICAR_SETUP_COMMANDS = [`curl -LO ${EICAR_URL}`, `chmod +x ${EICAR_FILE_NAME}`] as const;
/** Elastic Defend malware protection blocks this execution and alerts on the file. */
const EICAR_EXECUTE_COMMAND = `./${EICAR_FILE_NAME}`;
/**
 * The error Elastic Defend's block produces. Without the block, executing the file still fails,
 * but with a different error: it has no shebang and is not a valid program.
 */
const BLOCKED_EXECUTION_ERROR = /Operation not permitted/;
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
      await deleteEndpointSecurityAlerts(esClient, enrolledEndpoint.agentId, EICAR_FILE_NAME);
    });

    apiTest(
      'promotes an alert from a live Endpoint to a Detection Engine alert',
      async ({ apiClient, config, esClient, kbnClient, log, requestAuth, enrolledEndpoint }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { agentId, hostname } = enrolledEndpoint;

        await apiTest.step('Elastic Defend blocks executing the EICAR test file', async () => {
          for (const command of EICAR_SETUP_COMMANDS) {
            const { exitCode, stderr } = await runCommandOnHost(hostname, command);
            expect(exitCode, `[${command}] failed on ${hostname}: ${stderr || '<empty>'}`).toBe(0);
          }

          const { exitCode, stderr } = await runCommandOnHost(hostname, EICAR_EXECUTE_COMMAND);
          const executeResult = `exit code ${exitCode}, stderr: ${stderr || '<empty>'}`;
          log.info(
            `[edr_real_fleet] ran [${EICAR_EXECUTE_COMMAND}] on ${hostname}: ${executeResult}`
          );
          expect(stderr, `[${EICAR_EXECUTE_COMMAND}] was not blocked: ${executeResult}`).toMatch(
            BLOCKED_EXECUTION_ERROR
          );
        });

        await apiTest.step('the Endpoint streams an alert for the EICAR test file', async () => {
          await expect
            .poll(() => countEndpointAlertsForFile(esClient, agentId, EICAR_FILE_NAME), {
              timeout: ENDPOINT_ALERT_TIMEOUT_MS,
              intervals: [POLL_INTERVAL_MS],
              message: `no Endpoint alert for ${EICAR_FILE_NAME} on agent ${agentId} in ${ENDPOINT_ALERTS_INDEX}`,
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
                    query: getEndpointSecurityAlertsQuery(agentId, EICAR_FILE_NAME),
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
                message: `no Endpoint Security Detection Engine alert for ${EICAR_FILE_NAME} on agent ${agentId}`,
              }
            )
            .toBeGreaterThan(0);
        });
      }
    );
  }
);
