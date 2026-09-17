/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { mergeSyntheticsApiHeaders } from '../../../scout/common/fixtures';
import {
  addMonitor,
  deleteMonitors,
  enableSynthetics,
  testNowMonitor,
} from '../../../scout/common/fixtures/monitors';
import {
  getAgentPolicyRevision,
  getPackagePolicyForMonitor,
  setFleetAgentLastCheckin,
} from '../../../scout/common/fixtures/fleet';
import { tryForTime } from '../../../scout/common/fixtures/retry';
import { agentIdFromCondition } from '../../../../server/synthetics_service/private_location/assign_by_condition';
import { STALE_CHECKIN_MS } from '../../../../server/synthetics_service/private_location/plan_rebalance';
import { apiTest } from '../fixtures/sharding';
import { buildMonitorPayload } from '../fixtures/monitor_payloads';
import {
  deleteSyntheticsDocsForAgent,
  isCheckUp,
  waitForSyntheticsCheck,
} from '../fixtures/wait_for_check';

const TEST_TIMEOUT = 10 * 60 * 1000;
const CHECK_TIMEOUT = 3 * 60 * 1000;
const MONITOR_COUNT = 2;
const SLOW_SCHEDULE = { number: '60', unit: 'm' } as const;

const assignedAgentId = async (
  apiClient: ApiClientFixture,
  adminHeaders: Record<string, string>,
  monitorId: string,
  locationId: string
): Promise<string | undefined> => {
  const policy = await getPackagePolicyForMonitor(apiClient, adminHeaders, monitorId, locationId);
  return agentIdFromCondition(policy?.condition);
};

/**
 * Real Elastic Agent + Fleet Server: two lightweight agents on a scalable
 * private location, HTTP monitors get a `${agent.id}` pin, then killing one
 * agent moves its monitors onto the survivor and a test-now actually runs there.
 *
 * Requires Docker and the `synthetics_agent_e2e` Scout server config:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet synthetics_agent_e2e
 *   node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/synthetics/test/scout_synthetics_agent_e2e/api/parallel.playwright.config.ts
 */
apiTest.describe(
  'Synthetics real-agent sharding failover',
  { tag: ['@local-stateful-classic'] },
  () => {
    let editorHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;
    const createdMonitorIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, apiClient, agentStack }) => {
      apiTest.setTimeout(TEST_TIMEOUT);
      const { apiKeyHeader: editorKey } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(editorKey, { Accept: 'application/json' });
      const { apiKeyHeader: adminKey } = await requestAuth.getApiKey('admin');
      adminHeaders = mergeSyntheticsApiHeaders(adminKey, { Accept: 'application/json' });
      await enableSynthetics(apiClient, editorHeaders);
      expect(agentStack.agents).toHaveLength(2);
      expect(agentStack.privateLocation.isAgentSharding).toBe(true);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      if (createdMonitorIds.length > 0) {
        await deleteMonitors(apiClient, editorHeaders, createdMonitorIds, { ignoreErrors: true });
      }
    });

    apiTest(
      'assigns HTTP monitors then failovers a stopped agent onto the survivor',
      async ({ apiClient, esClient, agentStack }) => {
        apiTest.setTimeout(TEST_TIMEOUT);
        const enrolledIds = agentStack.agents.map((agent) => agent.id);
        const locationId = agentStack.privateLocation.id;

        for (let i = 0; i < MONITOR_COUNT; i++) {
          const res = await addMonitor(apiClient, editorHeaders, {
            ...buildMonitorPayload('http', agentStack),
            name: `agent-e2e-shard-${i}-${agentStack.runId}`,
            schedule: SLOW_SCHEDULE,
          });
          createdMonitorIds.push((res.body as { id: string }).id);
        }

        const initialAssignment = new Map<string, string>();
        await tryForTime(90_000, async () => {
          initialAssignment.clear();
          for (const monitorId of createdMonitorIds) {
            const agentId = await assignedAgentId(apiClient, adminHeaders, monitorId, locationId);
            expect(agentId, `monitor ${monitorId} has an assigned agent`).toBeDefined();
            expect(enrolledIds).toContain(agentId);
            initialAssignment.set(monitorId, agentId as string);
          }
        });

        const onFirst = [...initialAssignment.entries()].filter(([, id]) => id === enrolledIds[0]);
        const onSecond = [...initialAssignment.entries()].filter(([, id]) => id === enrolledIds[1]);
        expect(onFirst.length + onSecond.length).toBe(MONITOR_COUNT);

        const [killedAgentId, survivorAgentId, movedMonitorIds] =
          onFirst.length > 0
            ? [enrolledIds[0], enrolledIds[1], onFirst.map(([id]) => id)]
            : [enrolledIds[1], enrolledIds[0], onSecond.map(([id]) => id)];
        expect(
          movedMonitorIds.length,
          'at least one monitor must be on the killed agent'
        ).toBeGreaterThan(0);

        const revisionBeforeFailover = await getAgentPolicyRevision(
          apiClient,
          adminHeaders,
          agentStack.privateLocation.agentPolicyId
        );

        agentStack.stopAgentContainer(killedAgentId);
        await setFleetAgentLastCheckin(
          esClient,
          killedAgentId,
          new Date(Date.now() - STALE_CHECKIN_MS - 30_000).toISOString()
        );
        await deleteSyntheticsDocsForAgent(esClient, killedAgentId);

        await tryForTime(
          4 * 60_000,
          async () => {
            for (const monitorId of movedMonitorIds) {
              const agentId = await assignedAgentId(apiClient, adminHeaders, monitorId, locationId);
              expect(agentId, `monitor ${monitorId} should not be dropped`).toBeDefined();
              expect(agentId, `monitor ${monitorId} should have moved off the stopped agent`).toBe(
                survivorAgentId
              );
            }
            const revisionAfterFailover = await getAgentPolicyRevision(
              apiClient,
              adminHeaders,
              agentStack.privateLocation.agentPolicyId
            );
            expect(revisionAfterFailover).toBeGreaterThan(revisionBeforeFailover);
          },
          { intervalMs: 10_000 }
        );

        const movedMonitorId = movedMonitorIds[0];
        const testNowRes = await testNowMonitor(apiClient, editorHeaders, movedMonitorId);
        const testRunId = (testNowRes.body as { testRunId?: string }).testRunId;

        const check = await waitForSyntheticsCheck(esClient, {
          type: 'http',
          configId: movedMonitorId,
          testRunId,
          agentId: survivorAgentId,
          timeoutMs: CHECK_TIMEOUT,
        });
        expect(isCheckUp(check)).toBe(true);
        expect(check.agent?.id).toBe(survivorAgentId);
        expect(check.url?.full).toContain(agentStack.target.url);
      }
    );
  }
);
