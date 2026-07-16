/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import type { ConcreteTaskInstance, IntervalSchedule } from '@kbn/task-manager-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import pRetry from 'p-retry';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { isScalableLocation } from '../synthetics_service/private_location/assign_shards';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import type { SyntheticsServerSetup } from '../types';

const TASK_TYPE = 'Synthetics:Rebalance-Private-Location-Shards';
export const REBALANCE_SHARDS_TASK_ID = `${TASK_TYPE}-single-instance`;
export const DEFAULT_REBALANCE_SCHEDULE = '1m';

// Agents poll Fleet roughly every 30s. We treat a shard as stale when no agent
// has checked in within 3 poll intervals. This is time-based (a sustained
// absence), which is both the failure signal and the blip tolerance — far
// tighter than Fleet's built-in offline status (12 intervals ≈ 6 min), whose lag
// otherwise dominates failover time. Kept conservative on purpose: a false
// eviction of a still-live agent risks brief double execution of a monitor.
export const STALE_CHECKIN_MS = 90_000;

/**
 * Fetches the freshest agent `last_checkin` per shard policy in a single
 * aggregation query, rather than N per-shard status calls. Empty result for a
 * shard (no agents, or none ever checked in) is treated as stale by callers.
 */
export const getShardLastCheckins = async (
  server: SyntheticsServerSetup,
  shardIds: string[]
): Promise<Map<string, number>> => {
  const checkins = new Map<string, number>();
  if (shardIds.length === 0) {
    return checkins;
  }

  const res = await server.fleet.agentService.asInternalUser.listAgents({
    showInactive: false,
    perPage: 0,
    kuery: `policy_id:(${shardIds.map((id) => `"${id}"`).join(' or ')})`,
    aggregations: {
      by_policy: {
        terms: { field: 'policy_id', size: shardIds.length },
        aggs: { last_checkin: { max: { field: 'last_checkin' } } },
      },
    },
  });

  const buckets =
    (
      res.aggregations?.by_policy as
        | { buckets?: Array<{ key: string; last_checkin?: { value?: number | null } }> }
        | undefined
    )?.buckets ?? [];

  for (const bucket of buckets) {
    const value = bucket.last_checkin?.value;
    if (typeof value === 'number') {
      checkins.set(bucket.key, value);
    }
  }

  return checkins;
};

/**
 * POC: keeps monitor→shard assignment aligned with the set of healthy agents for
 * scalable private locations. Health is derived from raw agent check-ins (see
 * {@link getShardLastCheckins}); the assignment itself lives in `assignShard`
 * (rendezvous hashing), applied in `rebalanceShards`. Intentionally separate from
 * the already-overloaded `Synthetics:Sync-Private-Location-Monitors` task.
 */
export class RebalancePrivateLocationShardsTask {
  constructor(
    private readonly serverSetup: SyntheticsServerSetup,
    private readonly syntheticsMonitorClient: SyntheticsMonitorClient
  ) {}

  registerTaskDefinition(taskManager: TaskManagerSetupContract) {
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Synthetics Rebalance Private Location Shards Task',
        description:
          'Reassigns monitors across the healthy agent-policy shards of scalable private locations for at-most-once execution and failover.',
        timeout: '10m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
          run: async () => this.runTask({ taskInstance }),
        }),
      },
    });
  }

  async runTask({ taskInstance }: { taskInstance: ConcreteTaskInstance }): Promise<{
    state: Record<string, unknown>;
    schedule?: IntervalSchedule;
  }> {
    const { coreStart, logger } = this.serverSetup;
    const { privateLocationAPI } = this.syntheticsMonitorClient;
    const interval =
      (taskInstance.schedule as IntervalSchedule | undefined)?.interval ??
      DEFAULT_REBALANCE_SCHEDULE;
    const schedule = { interval };

    try {
      const soClient = coreStart.savedObjects.createInternalRepository();
      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
      const scalableLocations = allPrivateLocations.filter(isScalableLocation);

      if (scalableLocations.length === 0) {
        return { state: taskInstance.state, schedule };
      }

      const now = Date.now();
      const allShardIds = [
        ...new Set(scalableLocations.flatMap((loc) => loc.agentPolicyIds ?? [])),
      ];

      // One aggregation query for every shard across all scalable locations.
      let checkins: Map<string, number> | undefined;
      try {
        checkins = await getShardLastCheckins(this.serverSetup, allShardIds);
      } catch (e) {
        this.debugLog(
          `Aggregated check-in query failed; falling back to Fleet aggregate status: ${e.message}`
        );
      }

      for (const location of scalableLocations) {
        const shardIds = location.agentPolicyIds ?? [];
        const healthyShards = checkins
          ? shardIds.filter((id) => {
              const last = checkins!.get(id);
              return last !== undefined && now - last <= STALE_CHECKIN_MS;
            })
          : await this.getHealthyShardsFromStatus(shardIds);

        this.debugLog(
          `location ${location.id}: healthy=${healthyShards.length}/${shardIds.length}`
        );

        if (healthyShards.length === 0) {
          logger.warn(
            `[RebalanceShards] No healthy shards for private location ${location.id} (${location.label}); skipping rebalance.`
          );
          continue;
        }

        // Idempotent: only monitors whose assigned shard changed are rewritten.
        // Steady state (all shards healthy) performs zero writes.
        const { total, moved } = await privateLocationAPI.rebalanceShards({
          location,
          healthyShards,
        });

        this.debugLog(
          `Location ${location.id}: moved ${moved}/${total} monitors over ${healthyShards.length}/${shardIds.length} healthy shards`
        );
      }
    } catch (error) {
      logger.error(
        `[RebalanceShards] Rebalance of private location shards failed: ${error.message}`
      );
    }

    return { state: taskInstance.state, schedule };
  }

  /** Fallback health check via Fleet's aggregate online status (used if the check-in query fails). */
  private async getHealthyShardsFromStatus(shardIds: string[]): Promise<string[]> {
    const { fleet } = this.serverSetup;
    const statuses = await Promise.all(
      shardIds.map(async (id) => {
        try {
          const status = await fleet.agentService.asInternalUser.getAgentStatusForAgentPolicy(id);
          return { id, online: status.online };
        } catch (e) {
          this.debugLog(`Failed to read agent status for shard ${id}: ${e.message}`);
          return { id, online: 0 };
        }
      })
    );
    return statuses.filter(({ online }) => online > 0).map(({ id }) => id);
  }

  start = async () => {
    const {
      pluginsStart: { taskManager },
    } = this.serverSetup;

    let schedule: IntervalSchedule = { interval: DEFAULT_REBALANCE_SCHEDULE };
    try {
      const existingTask = await taskManager.get(REBALANCE_SHARDS_TASK_ID);
      if (existingTask.schedule) {
        schedule = existingTask.schedule as IntervalSchedule;
      }
    } catch (_err) {
      // task doesn't exist yet — default schedule will be used on creation
    }

    await taskManager.ensureScheduled({
      id: REBALANCE_SHARDS_TASK_ID,
      state: {},
      schedule,
      taskType: TASK_TYPE,
      params: {},
    });
    this.debugLog('Rebalance private location shards task scheduled');
  };

  private debugLog = (message: string) => {
    this.serverSetup.logger.debug(`[RebalancePrivateLocationShardsTask] ${message}`);
  };
}

export const runRebalanceShardsTaskSoon = async ({
  server,
  retries = 5,
}: {
  server: SyntheticsServerSetup;
  retries?: number;
}) => {
  try {
    await pRetry(
      async () => {
        await server.pluginsStart.taskManager.runSoon(REBALANCE_SHARDS_TASK_ID);
      },
      { retries }
    );
  } catch (error) {
    server.logger.error(
      `Error scheduling rebalance private location shards task: ${error.message}`,
      {
        error,
      }
    );
  }
};
