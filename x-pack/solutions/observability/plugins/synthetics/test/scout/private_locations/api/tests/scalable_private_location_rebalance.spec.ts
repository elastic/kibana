/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { ScoutPrivateLocation } from '../../../common/services/synthetics_private_location_api_service';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import { addMonitor, deleteMonitors } from '../../../common/fixtures/monitors';
import {
  getPackagePolicyForMonitor,
  getAgentPolicyRevision,
  indexFakeFleetAgent,
  setFleetAgentLastCheckin,
  deleteFleetAgents,
} from '../../../common/fixtures/fleet';
import { tryForTime } from '../../../common/fixtures/retry';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';
import { agentIdFromCondition } from '../../../../../server/synthetics_service/private_location/assign_by_condition';
import { STALE_CHECKIN_MS } from '../../../../../server/synthetics_service/private_location/plan_rebalance';

const TEST_TIMEOUT = 7 * 60 * 1000;
const MONITOR_COUNT = 8;

/**
 * The `RebalancePrivateLocationShardsTask` unit tests (`rebalance_private_location_shards_task.test.ts`,
 * `plan_rebalance.test.ts`) fully mock Fleet and time; nothing runs the real,
 * scheduled task against a real Fleet agent-health signal end to end. This
 * spec fakes one agent going stale (`last_checkin` older than
 * `STALE_CHECKIN_MS`, never refreshed -- a fake agent that never runs real
 * Heartbeat also never satisfies the `synthetics-*` data-plane liveness veto,
 * so eviction is governed purely by check-in staleness here) and waits for
 * the task's own ~1m schedule to detect it and move its monitors, proving the
 * production task -- not a mock of it -- performs failover with no drops and
 * a real Fleet agent-policy revision bump.
 *
 * Runs under the default Scout config set: the plugin registers and starts
 * `RebalancePrivateLocationShardsTask` unconditionally, and its kill-switch
 * lives in task-manager state that defaults to enabled (see
 * `isRebalancePrivateLocationShardsEnabled`), so no boot-time server arg is
 * needed. A spec that wants the switch off should flip it at runtime with
 * `setRebalancePrivateLocationShardsEnabled`.
 */
apiTest.describe('ScalablePrivateLocationRebalance', { tag: ['@local-stateful-classic'] }, () => {
  let editorHeaders: Record<string, string>;
  let adminHeaders: Record<string, string>;
  let privateLocation: ScoutPrivateLocation;
  let agentAId: string;
  let agentBId: string;
  const monitorIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth, apiServices, kbnClient, esClient }) => {
    const { apiKeyHeader: editorKey } = await requestAuth.getApiKey('editor');
    editorHeaders = mergeSyntheticsApiHeaders(editorKey);
    const { apiKeyHeader: adminKey } = await requestAuth.getApiKey('admin');
    adminHeaders = mergeSyntheticsApiHeaders(adminKey);

    await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    await apiServices.syntheticsPrivateLocations.installSyntheticsPackage();
    privateLocation = await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(
      'default',
      { isAgentSharding: true }
    );

    agentAId = await indexFakeFleetAgent(esClient, privateLocation.agentPolicyId, {
      hostname: 'rebalance-agent-a',
    });
    agentBId = await indexFakeFleetAgent(esClient, privateLocation.agentPolicyId, {
      hostname: 'rebalance-agent-b',
    });
  });

  apiTest.afterAll(async ({ apiClient, apiServices, kbnClient, esClient }) => {
    if (monitorIds.length > 0) {
      await deleteMonitors(apiClient, editorHeaders, monitorIds).catch(() => undefined);
    }
    await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    await deleteFleetAgents(esClient, [agentAId, agentBId]);
    await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
  });

  apiTest(
    'moves a stale agent’s monitors to the survivor with no drops and a revision bump',
    async ({ apiClient, esClient }) => {
      apiTest.setTimeout(TEST_TIMEOUT);

      for (let i = 0; i < MONITOR_COUNT; i++) {
        const res = await addMonitor(apiClient, editorHeaders, {
          ...httpMonitorFixture,
          locations: [privateLocation],
          name: `Rebalance test monitor ${i} ${uuidv4()}`,
          namespace: 'default',
        });
        monitorIds.push((res.body as { id: string }).id);
      }

      const initialAssignment = new Map<string, string>();
      await tryForTime(90_000, async () => {
        for (const monitorId of monitorIds) {
          const policy = await getPackagePolicyForMonitor(
            apiClient,
            adminHeaders,
            monitorId,
            privateLocation.id
          );
          const agentId = agentIdFromCondition(policy?.condition);
          expect(
            agentId,
            `monitor ${monitorId} has an assigned (non-sentinel) agent`
          ).toBeDefined();
          initialAssignment.set(monitorId, agentId as string);
        }
      });

      const onA = [...initialAssignment.entries()].filter(([, a]) => a === agentAId);
      const onB = [...initialAssignment.entries()].filter(([, a]) => a === agentBId);
      // With 8 monitors over 2 equal-capacity agents, LPT balancing should
      // never starve either one; fail loudly rather than silently proving
      // nothing if it somehow does.
      expect(onA.length + onB.length).toBe(MONITOR_COUNT);
      const [killedAgentId, survivorAgentId, movedMonitorIds] =
        onA.length > 0
          ? [agentAId, agentBId, onA.map(([id]) => id)]
          : [agentBId, agentAId, onB.map(([id]) => id)];
      expect(
        movedMonitorIds.length,
        'at least one monitor must be on the killed agent'
      ).toBeGreaterThan(0);

      const revisionBeforeFailover = await getAgentPolicyRevision(
        apiClient,
        adminHeaders,
        privateLocation.agentPolicyId
      );

      // Backdate well past STALE_CHECKIN_MS so the very next task tick
      // treats it as failed over, rather than waiting out the window in
      // real time on top of the task's own schedule.
      await setFleetAgentLastCheckin(
        esClient,
        killedAgentId,
        new Date(Date.now() - STALE_CHECKIN_MS - 30_000).toISOString()
      );

      await tryForTime(
        4 * 60_000,
        async () => {
          for (const monitorId of movedMonitorIds) {
            const policy = await getPackagePolicyForMonitor(
              apiClient,
              adminHeaders,
              monitorId,
              privateLocation.id
            );
            const agentId = agentIdFromCondition(policy?.condition);
            expect(agentId, `monitor ${monitorId} should not be dropped`).toBeDefined();
            expect(agentId, `monitor ${monitorId} should have moved off the stale agent`).toBe(
              survivorAgentId
            );
          }

          const revisionAfterFailover = await getAgentPolicyRevision(
            apiClient,
            adminHeaders,
            privateLocation.agentPolicyId
          );
          expect(revisionAfterFailover).toBeGreaterThan(revisionBeforeFailover);
        },
        { intervalMs: 10_000 }
      );
    }
  );
});
