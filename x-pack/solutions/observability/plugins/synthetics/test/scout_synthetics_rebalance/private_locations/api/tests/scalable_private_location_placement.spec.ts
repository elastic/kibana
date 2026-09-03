/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { ScoutPrivateLocation } from '../../../../scout/common/services/synthetics_private_location_api_service';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../../scout/common/fixtures';
import { addMonitor, deleteMonitors } from '../../../../scout/common/fixtures/monitors';
import {
  getPackagePolicyForMonitor,
  indexFakeFleetAgent,
  deleteFleetAgents,
} from '../../../../scout/common/fixtures/fleet';
import { tryForTime } from '../../../../scout/common/fixtures/retry';
import { httpMonitorFixture } from '../../../../scout/common/fixtures/data/http_monitor';
import {
  agentIdFromCondition,
  UNASSIGNED_CONDITION,
} from '../../../../../server/synthetics_service/private_location/assign_by_condition';

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
 * zero agents forces every monitor through the sentinel `UNASSIGNED_CONDITION`
 * first, so the *first* real placement both agents ever receive goes through
 * Phase 2's capacity-weighted LPT.
 *
 * Lives under `test/scout_synthetics_rebalance/` (a dedicated Scout config
 * set, see `synthetics_rebalance/stateful/classic.stateful.config.ts` in
 * `@kbn/scout`) because `RebalancePrivateLocationShardsTask` is disabled by
 * default and its config flag is only read once at Kibana boot -- it can't be
 * flipped on from within a test against the default config set.
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
      // which placement phase actually ran.
      await tryForTime(30_000, async () => {
        for (const monitorId of monitorIds) {
          const policy = await getPackagePolicyForMonitor(
            apiClient,
            adminHeaders,
            monitorId,
            privateLocation.id
          );
          expect(policy?.condition).toBe(UNASSIGNED_CONDITION);
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
