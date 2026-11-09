/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { mergeSyntheticsApiHeaders } from '../../../scout/common/fixtures';
import { SYNTHETICS_API_URLS } from '../../../scout/common/fixtures/constants';
import { addMonitor, deleteMonitors } from '../../../scout/common/fixtures/monitors';
import { getAgentPolicyRevision } from '../../../scout/common/fixtures/fleet';
import { delay } from '../../../scout/common/fixtures/retry';
import { apiTest } from '../fixtures/sharding';
import { buildMonitorPayload } from '../fixtures/monitor_payloads';
import { assignedAgentId, waitUntilAssigned } from '../fixtures/rebalance';
import { findSyntheticsCheck, waitForSyntheticsCheck } from '../fixtures/wait_for_check';

const TEST_TIMEOUT_MS = 15 * 60 * 1000;
const MONITOR_COUNT = 2;
const PIN_TIMEOUT_MS = 3 * 60_000;
/** Past the one-off agent policy revision bump that follows the first pins. */
const RECOVERY_MS = 2 * 60_000;

const setShardRebalance = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  enabled: boolean
) => {
  const res = await apiClient.put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS, {
    headers,
    body: { rebalancePrivateLocationShardsEnabled: enabled },
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(200);
};

/**
 * Pinning monitors that already run on real agents (rebalance switch off, then
 * on: the same transition as a 9.5 to 9.6 upgrade or a license renewal) can stop
 * them until a later agent policy revision (elastic/elastic-agent#17714). The
 * rebalance task bumps the revision once after the first pins, so every monitor
 * must be running on its pinned agent shortly after.
 *
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet synthetics_agent_e2e
 *   node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/synthetics/test/scout_synthetics_agent_e2e/api/parallel.playwright.config.ts
 */
apiTest.describe(
  'Synthetics real-agent pinning of running monitors',
  { tag: ['@local-stateful-classic'] },
  () => {
    let editorHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;
    const createdMonitorIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, agentStack }) => {
      const { apiKeyHeader: editorKey } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(editorKey, { Accept: 'application/json' });
      const { apiKeyHeader: adminKey } = await requestAuth.getApiKey('admin');
      adminHeaders = mergeSyntheticsApiHeaders(adminKey, { Accept: 'application/json' });
      expect(agentStack.agents).toHaveLength(2);
    });

    apiTest.afterEach(async ({ apiClient }) => {
      if (!adminHeaders) {
        return;
      }
      await setShardRebalance(apiClient, adminHeaders, true);
      const ids = createdMonitorIds.splice(0, createdMonitorIds.length);
      await deleteMonitors(apiClient, editorHeaders, ids, { ignoreErrors: true });
    });

    apiTest(
      'keeps running monitors running when the rebalance switch turns back on',
      async ({ apiClient, esClient, agentStack }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const enrolledIds = agentStack.agents.map((agent) => agent.id);
        const { id: locationId, agentPolicyId } = agentStack.privateLocation;

        await setShardRebalance(apiClient, adminHeaders, false);
        const createdAt = new Date().toISOString();
        for (let i = 0; i < MONITOR_COUNT; i++) {
          const res = await addMonitor(apiClient, editorHeaders, {
            ...buildMonitorPayload('http', agentStack),
            name: `agent-e2e-pin-${i}-${agentStack.runId}`,
            schedule: { number: '10', unit: 's' },
          });
          createdMonitorIds.push((res.body as { id: string }).id);
        }

        // Unpinned, every agent runs every monitor.
        for (const monitorId of createdMonitorIds) {
          expect(
            await assignedAgentId(apiClient, adminHeaders, monitorId, locationId)
          ).toBeUndefined();
          for (const agentId of enrolledIds) {
            await waitForSyntheticsCheck(esClient, {
              type: 'http',
              configId: monitorId,
              agentId,
              since: createdAt,
            });
          }
        }

        await setShardRebalance(apiClient, adminHeaders, true);
        const assignment = await waitUntilAssigned(
          apiClient,
          adminHeaders,
          createdMonitorIds,
          enrolledIds,
          locationId,
          PIN_TIMEOUT_MS
        );
        const pinnedRevision = await getAgentPolicyRevision(apiClient, adminHeaders, agentPolicyId);
        await delay(RECOVERY_MS);

        expect(
          await getAgentPolicyRevision(apiClient, adminHeaders, agentPolicyId),
          'the agent policy is bumped once more after the first pins'
        ).toBeGreaterThan(pinnedRevision);
        const recoveredAt = new Date().toISOString();
        for (const [monitorId, agentId] of assignment) {
          await waitForSyntheticsCheck(esClient, {
            type: 'http',
            configId: monitorId,
            agentId,
            since: recoveredAt,
            timeoutMs: 60_000,
          });
          const latest = await findSyntheticsCheck(esClient, {
            type: 'http',
            configId: monitorId,
            since: recoveredAt,
          });
          expect(latest?.agent?.id, `monitor ${monitorId} runs on its pinned agent`).toBe(agentId);
        }
      }
    );
  }
);
