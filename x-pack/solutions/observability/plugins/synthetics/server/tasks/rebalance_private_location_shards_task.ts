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
import { DeployPrivateLocationMonitors } from './deploy_private_location_monitors';

const TASK_TYPE = 'Synthetics:Rebalance-Private-Location-Shards';
export const REBALANCE_SHARDS_TASK_ID = `${TASK_TYPE}-single-instance`;
// Shorter than the 5m monitor sync: shard health changes should reassign work quickly.
export const DEFAULT_REBALANCE_SCHEDULE = '1m';

/**
 * POC: keeps monitor→shard assignment aligned with the set of online agents for
 * scalable private locations. It only reads shard health and re-syncs the
 * location's monitors with the healthy shard subset; the assignment itself lives
 * in `assignShard` (rendezvous hashing), applied in `generateNewPolicy`. This is
 * intentionally separate from the already-overloaded
 * `Synthetics:Sync-Private-Location-Monitors` task.
 */
export class RebalancePrivateLocationShardsTask {
  private readonly deployPackagePolicies: DeployPrivateLocationMonitors;

  constructor(
    private readonly serverSetup: SyntheticsServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient
  ) {
    this.deployPackagePolicies = new DeployPrivateLocationMonitors(
      serverSetup,
      syntheticsMonitorClient
    );
  }

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
    const { coreStart, logger, encryptedSavedObjects } = this.serverSetup;
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

      for (const location of scalableLocations) {
        const shardIds = location.agentPolicyIds ?? [];
        const healthyShards = await this.getHealthyShards(shardIds);

        if (healthyShards.length === 0) {
          logger.warn(
            `[RebalanceShards] No healthy shards for private location ${location.id} (${location.label}); skipping rebalance.`
          );
          continue;
        }

        this.debugLog(
          `Rebalancing location ${location.id} over ${healthyShards.length}/${shardIds.length} healthy shards`
        );

        // Feed editMonitors the healthy subset as the shard pool so assignShard
        // reassigns only monitors that were on now-unhealthy shards.
        await this.deployPackagePolicies.syncAllPackagePolicies({
          allPrivateLocations: [{ ...location, agentPolicyIds: healthyShards }],
          encryptedSavedObjects,
          soClient,
          privateLocationId: location.id,
        });
      }
    } catch (error) {
      logger.error(`[RebalanceShards] Rebalance of private location shards failed: ${error.message}`);
      return { state: taskInstance.state, schedule };
    }

    return { state: taskInstance.state, schedule };
  }

  private async getHealthyShards(shardIds: string[]): Promise<string[]> {
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
    server.logger.error(`Error scheduling rebalance private location shards task: ${error.message}`, {
      error,
    });
  }
};
