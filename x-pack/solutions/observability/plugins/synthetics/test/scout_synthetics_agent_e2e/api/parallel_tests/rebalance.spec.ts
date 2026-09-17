/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { mergeSyntheticsApiHeaders } from '../../../scout/common/fixtures';
import { deleteMonitors, enableSynthetics } from '../../../scout/common/fixtures/monitors';
import {
  getAgentPolicyRevision,
  setFleetAgentLastCheckin,
  waitForFleetAgentOnline,
} from '../../../scout/common/fixtures/fleet';
import { apiTest } from '../fixtures/sharding';
import {
  assertAssignmentsHold,
  CHECK_TIMEOUT_MS,
  createHttpMonitors,
  pickFailover,
  REBALANCE_OBSERVE_MS,
  staleCheckinIso,
  waitForFailoverAndAck,
  waitUntilAgentAppliedRevision,
  waitUntilAssigned,
} from '../fixtures/rebalance';
import {
  deleteSyntheticsDocsForAgent,
  isCheckUp,
  waitForSyntheticsCheck,
} from '../fixtures/wait_for_check';

const VETO_TIMEOUT_MS = 12 * 60 * 1000;
const FAILOVER_RECOVERY_TIMEOUT_MS = 20 * 60 * 1000;
const MONITOR_COUNT = 2;

/**
 * Real Elastic Agent + Fleet Server coverage of the shard-rebalance *task
 * effects* that unit tests cannot see (they mock Fleet, time, and Heartbeat)
 * and that the fake-agent Scout spec cannot see (no synthetics-* data plane).
 *
 * Not duplicated here: STALE_CHECKIN_MS / RECOVERY_STABILITY_MS boundaries,
 * LPT math, kill-switch pin drain, abort isolation — those live in
 * `plan_rebalance.test.ts`, `assign_shards.test.ts`, and
 * `rebalance_private_location_shards_task.test.ts`. Placement-without-Heartbeat
 * failover is `scalable_private_location_rebalance.spec.ts`.
 *
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet synthetics_agent_e2e
 *   node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/synthetics/test/scout_synthetics_agent_e2e/api/parallel.playwright.config.ts
 */
apiTest.describe(
  'Synthetics real-agent shard rebalance',
  { tag: ['@local-stateful-classic'] },
  () => {
    let editorHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;
    const createdMonitorIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, apiClient, agentStack }) => {
      const { apiKeyHeader: editorKey } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(editorKey, { Accept: 'application/json' });
      const { apiKeyHeader: adminKey } = await requestAuth.getApiKey('admin');
      adminHeaders = mergeSyntheticsApiHeaders(adminKey, { Accept: 'application/json' });
      await enableSynthetics(apiClient, editorHeaders);
      expect(agentStack.agents).toHaveLength(2);
      expect(agentStack.privateLocation.isAgentSharding).toBe(true);
    });

    apiTest.afterEach(async ({ apiClient, agentStack }) => {
      if (!adminHeaders) {
        return;
      }
      if (createdMonitorIds.length > 0) {
        const ids = createdMonitorIds.splice(0, createdMonitorIds.length);
        await deleteMonitors(apiClient, editorHeaders, ids, { ignoreErrors: true });
      }
      for (const agent of agentStack.agents) {
        agentStack.startAgentContainer(agent.id);
      }
      for (const agent of agentStack.agents) {
        await waitForFleetAgentOnline(apiClient, adminHeaders, agent.id);
      }
    });

    apiTest(
      'does not fail over a live agent whose Fleet check-in looks stale',
      async ({ apiClient, esClient, agentStack }) => {
        apiTest.setTimeout(VETO_TIMEOUT_MS);
        const enrolledIds = agentStack.agents.map((agent) => agent.id);
        const locationId = agentStack.privateLocation.id;

        createdMonitorIds.push(
          ...(await createHttpMonitors(
            apiClient,
            editorHeaders,
            agentStack,
            MONITOR_COUNT,
            'agent-e2e-veto'
          ))
        );

        const initialAssignment = await waitUntilAssigned(
          apiClient,
          adminHeaders,
          createdMonitorIds,
          enrolledIds,
          locationId
        );
        const { killedAgentId: staleAgentId, movedMonitorIds } = pickFailover(
          initialAssignment,
          enrolledIds
        );

        await waitForSyntheticsCheck(esClient, {
          type: 'http',
          configId: movedMonitorIds[0],
          agentId: staleAgentId,
          timeoutMs: CHECK_TIMEOUT_MS,
        });

        await assertAssignmentsHold(
          apiClient,
          adminHeaders,
          initialAssignment,
          locationId,
          REBALANCE_OBSERVE_MS,
          async () => {
            await setFleetAgentLastCheckin(esClient, staleAgentId, staleCheckinIso());
          }
        );
      }
    );

    apiTest(
      'failovers a stopped agent onto the survivor, runs there, and does not steal load on recovery',
      async ({ apiClient, esClient, agentStack }) => {
        apiTest.setTimeout(FAILOVER_RECOVERY_TIMEOUT_MS);
        const enrolledIds = agentStack.agents.map((agent) => agent.id);
        const locationId = agentStack.privateLocation.id;
        const agentPolicyId = agentStack.privateLocation.agentPolicyId;

        createdMonitorIds.push(
          ...(await createHttpMonitors(
            apiClient,
            editorHeaders,
            agentStack,
            MONITOR_COUNT,
            'agent-e2e-failover'
          ))
        );

        const initialAssignment = await waitUntilAssigned(
          apiClient,
          adminHeaders,
          createdMonitorIds,
          enrolledIds,
          locationId
        );
        const { killedAgentId, survivorAgentId, movedMonitorIds } = pickFailover(
          initialAssignment,
          enrolledIds
        );

        const revisionBeforeFailover = await getAgentPolicyRevision(
          apiClient,
          adminHeaders,
          agentPolicyId
        );

        agentStack.stopAgentContainer(killedAgentId);
        await setFleetAgentLastCheckin(esClient, killedAgentId, staleCheckinIso());

        const deployedRevision = await waitForFailoverAndAck(apiClient, adminHeaders, {
          movedMonitorIds,
          survivorAgentId,
          locationId,
          agentPolicyId,
          revisionBeforeFailover,
          onPoll: () => deleteSyntheticsDocsForAgent(esClient, killedAgentId),
        });

        const movedMonitorId = movedMonitorIds[0];
        const check = await waitForSyntheticsCheck(esClient, {
          type: 'http',
          configId: movedMonitorId,
          agentId: survivorAgentId,
          timeoutMs: CHECK_TIMEOUT_MS,
        });
        expect(isCheckUp(check)).toBe(true);
        expect(check.agent?.id).toBe(survivorAgentId);
        expect(check.url?.full).toContain(agentStack.target.url);

        agentStack.startAgentContainer(killedAgentId);
        await waitForFleetAgentOnline(apiClient, adminHeaders, killedAgentId);
        await waitUntilAgentAppliedRevision(
          apiClient,
          adminHeaders,
          killedAgentId,
          Math.max(
            deployedRevision,
            await getAgentPolicyRevision(apiClient, adminHeaders, agentPolicyId)
          )
        );

        const postFailover = new Map(movedMonitorIds.map((id) => [id, survivorAgentId]));
        await assertAssignmentsHold(
          apiClient,
          adminHeaders,
          postFailover,
          locationId,
          REBALANCE_OBSERVE_MS
        );
      }
    );
  }
);
