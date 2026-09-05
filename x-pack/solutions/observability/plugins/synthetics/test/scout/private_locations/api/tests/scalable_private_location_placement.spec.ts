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
  indexFakeFleetAgent,
  deleteFleetAgents,
} from '../../../common/fixtures/fleet';
import { tryForTime } from '../../../common/fixtures/retry';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';
import { agentIdFromCondition } from '../../../../../server/synthetics_service/private_location/assign_by_condition';

const TEST_TIMEOUT = 4 * 60 * 1000;
const MONITOR_COUNT = 10;

/**
 * Only `assign_shards.test.ts` proves capacity-proportional placement, and it
 * does so entirely in-memory: real capacity comes from Fleet agent metadata
 * (`local_metadata.host.memory`) read through `getAgentInfo`/`agentService`,
 * a path no test ever exercised end-to-end. Two fake agents at a 4:1 memory
 * ratio (see `indexFakeFleetAgent`) prove that RAM figures reported by real
 * Fleet agents actually reach the balancer and skew real placement, not just
 * the pure function.
 *
 * The monitors are created *before* either fake agent exists, and the agents
 * are only added afterward. `rebalanceByCost`'s "Phase 1 -- retain" (see
 * `assign_shards.ts`) never moves a monitor off an agent it's already
 * healthily pinned to, purely for load-balance -- capacity only drives
 * placement of monitors that are *unplaced* (Phase 2, LPT) or being moved
 * onto a freshly-recovered agent (Phase 3). Creating both agents up front and
 * then waiting, as an earlier version of this spec did, only ever exercises
 * capacity-blind create-time rendezvous and Phase 1's retention -- the split
 * stays at whatever rendezvous picked and never self-corrects. Starting with
 * zero agents leaves every monitor's `condition` unset at create time (see
 * `generateNewPolicy` in `synthetics_private_location.ts`), so the *first*
 * real placement both agents ever receive goes through Phase 2's
 * capacity-weighted LPT.
 *
 * Runs under the default Scout config set: the plugin registers and starts
 * `RebalancePrivateLocationShardsTask` unconditionally, and its kill-switch
 * lives in task-manager state that defaults to enabled (see
 * `isRebalancePrivateLocationShardsEnabled`), so no boot-time server arg is
 * needed. A spec that wants the switch off should flip it at runtime with
 * `setRebalancePrivateLocationShardsEnabled`.
 */
apiTest.describe('ScalablePrivateLocationPlacement', { tag: ['@local-stateful-classic'] }, () => {
  let editorHeaders: Record<string, string>;
  let adminHeaders: Record<string, string>;
  let privateLocation: ScoutPrivateLocation;
  let highCapacityAgentId: string | undefined;
  let lowCapacityAgentId: string | undefined;
  const monitorIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth, apiServices, kbnClient }) => {
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
  });

  apiTest.afterAll(async ({ apiClient, apiServices, kbnClient, esClient }) => {
    if (monitorIds.length > 0) {
      await deleteMonitors(apiClient, editorHeaders, monitorIds).catch(() => undefined);
    }
    await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    await deleteFleetAgents(
      esClient,
      [highCapacityAgentId, lowCapacityAgentId].filter((id): id is string => Boolean(id))
    );
    await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
  });

  apiTest(
    'places proportionally more monitors on the higher-capacity agent',
    async ({ apiClient, esClient }) => {
      apiTest.setTimeout(TEST_TIMEOUT);

      for (let i = 0; i < MONITOR_COUNT; i++) {
        const res = await addMonitor(apiClient, editorHeaders, {
          ...httpMonitorFixture,
          locations: [privateLocation],
          name: `Placement test monitor ${i} ${uuidv4()}`,
          namespace: 'default',
        });
        monitorIds.push((res.body as { id: string }).id);
      }

      // Confirm they start unplaced (no agents enrolled yet) before adding
      // agents -- otherwise a false pass here wouldn't prove anything about
      // which placement phase actually ran. `generateNewPolicy` (see
      // `synthetics_private_location.ts`) *omits* `condition` entirely when
      // zero agents are enrolled at create time -- it never stamps the
      // `UNASSIGNED_CONDITION` sentinel itself, that's only ever written by a
      // later create/edit/rebalance pass once agents exist to be unassigned
      // *from*. So "unassigned" here means using the same helper the second
      // half of this test uses, not a literal-string comparison.
      await tryForTime(30_000, async () => {
        for (const monitorId of monitorIds) {
          const policy = await getPackagePolicyForMonitor(
            apiClient,
            adminHeaders,
            monitorId,
            privateLocation.id
          );
          expect(policy, `package policy should exist for monitor ${monitorId}`).toBeDefined();
          expect(
            agentIdFromCondition(policy?.condition),
            `monitor ${monitorId} should start unassigned`
          ).toBeUndefined();
        }
      });

      highCapacityAgentId = await indexFakeFleetAgent(esClient, privateLocation.agentPolicyId, {
        memoryMib: 4096,
        hostname: 'high-capacity-host',
      });
      lowCapacityAgentId = await indexFakeFleetAgent(esClient, privateLocation.agentPolicyId, {
        memoryMib: 1024,
        hostname: 'low-capacity-host',
      });

      await tryForTime(
        3 * 60_000,
        async () => {
          let onHighCapacity = 0;
          let onLowCapacity = 0;

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
            expect([highCapacityAgentId, lowCapacityAgentId]).toContain(agentId);

            if (agentId === highCapacityAgentId) {
              onHighCapacity++;
            } else if (agentId === lowCapacityAgentId) {
              onLowCapacity++;
            }
          }

          expect(onHighCapacity + onLowCapacity).toBe(MONITOR_COUNT);
          expect(
            onHighCapacity,
            `expected the 4x-RAM agent to host more monitors (high=${onHighCapacity}, low=${onLowCapacity})`
          ).toBeGreaterThan(onLowCapacity);
        },
        { intervalMs: 10_000 }
      );
    }
  );
});
