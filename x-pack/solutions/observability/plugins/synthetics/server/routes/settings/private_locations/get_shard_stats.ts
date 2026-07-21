/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { PackagePolicyService } from '../../../synthetics_service/private_location/package_policy_service';
import { getShardPool } from '../../../synthetics_service/private_location/assign_shards';
import {
  getShardLastCheckins,
  getShardTotalMemoryMib,
  STALE_CHECKIN_MS,
} from '../../../tasks/rebalance_private_location_shards_task';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

export interface ShardStat {
  policyId: string;
  monitors: number;
  lastCheckin: number | null;
  healthy: boolean;
  /**
   * Total host RAM (MiB) of the shard's agent, or null when the System
   * integration isn't shipping memory metrics for it (UI shows "N/A").
   */
  totalMemoryMib: number | null;
}

export interface LocationShardStats {
  locationId: string;
  shards: ShardStat[];
}

/**
 * Per-shard monitor counts and agent health for private locations, powering the
 * expandable rows in the private locations table. Reuses the same primitives as
 * the rebalance task: `countByShard` for assignment counts and
 * `getShardLastCheckins` for freshness (same stale window), so the UI reflects
 * what the rebalancer sees.
 */
export const getPrivateLocationShardStats: SyntheticsRestApiRouteFactory<
  LocationShardStats[]
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATION_SHARD_STATS,
  validate: {},
  handler: async ({ server, context, savedObjectsClient, syntheticsMonitorClient }) => {
    const { locations } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient,
      true
    );

    const packagePolicyService = new PackagePolicyService(server);
    // Host RAM lives in `metrics-system.memory-*`, which the internal user can't
    // read — query it as the request user so admins see real values (others "N/A").
    const { elasticsearch } = await context.core;
    const esClient = elasticsearch.client.asCurrentUser;
    const now = Date.now();

    return Promise.all(
      locations.map(async (location): Promise<LocationShardStats> => {
        const pool = getShardPool(location);
        const [counts, checkins, memory] = await Promise.all([
          packagePolicyService.countByShard({ shardIds: pool }),
          getShardLastCheckins(server, pool).catch(() => new Map<string, number>()),
          getShardTotalMemoryMib(server, pool, esClient).catch(() => new Map<string, number>()),
        ]);

        const shards = pool.map((policyId): ShardStat => {
          const lastCheckin = checkins.get(policyId) ?? null;
          return {
            policyId,
            monitors: counts.get(policyId) ?? 0,
            lastCheckin,
            healthy: lastCheckin !== null && now - lastCheckin <= STALE_CHECKIN_MS,
            totalMemoryMib: memory.get(policyId) ?? null,
          };
        });

        return { locationId: location.id, shards };
      })
    );
  },
});
