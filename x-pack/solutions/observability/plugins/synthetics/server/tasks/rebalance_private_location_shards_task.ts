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
import { isConditionShardedLocation } from '../synthetics_service/private_location/assign_by_condition';
import type { SyntheticsServerSetup } from '../types';

const TASK_TYPE = 'Synthetics:Rebalance-Private-Location-Shards';
export const REBALANCE_SHARDS_TASK_ID = `${TASK_TYPE}-single-instance`;
export const DEFAULT_REBALANCE_SCHEDULE = '1m';

/**
 * Keeps monitor→agent assignment aligned with the set of healthy agents for
 * scalable (condition-sharded) private locations, by rewriting each moved
 * monitor's `${agent.id}` condition. Intentionally separate from the already
 * overloaded `Synthetics:Sync-Private-Location-Monitors` task: it runs on its
 * own tighter interval and only ever touches condition-sharded locations.
 */
export class RebalancePrivateLocationShardsTask {
  constructor(private readonly serverSetup: SyntheticsServerSetup) {}

  registerTaskDefinition(taskManager: TaskManagerSetupContract) {
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Synthetics Rebalance Private Location Shards Task',
        description:
          'Reassigns monitors across the healthy agents of scalable private locations (by rewriting per-monitor agent conditions) for at-most-once execution and failover.',
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
    const interval =
      (taskInstance.schedule as IntervalSchedule | undefined)?.interval ??
      DEFAULT_REBALANCE_SCHEDULE;
    const schedule = { interval };

    try {
      const soClient = coreStart.savedObjects.createInternalRepository();
      const scalableLocations = (await getPrivateLocations(soClient, ALL_SPACES_ID)).filter(
        isConditionShardedLocation
      );

      if (scalableLocations.length === 0) {
        return { state: taskInstance.state, schedule };
      }

      // Health detection, placement and diff-based writes are wired up in the
      // following steps.
      this.debugLog(`Found ${scalableLocations.length} scalable private location(s) to rebalance`);
    } catch (error) {
      logger.error(
        `[RebalancePrivateLocationShardsTask] Rebalance of private location shards failed: ${error.message}`
      );
    }

    return { state: taskInstance.state, schedule };
  }

  async start() {
    const {
      pluginsStart: { taskManager },
    } = this.serverSetup;

    // Read the existing task schedule so ensureScheduled doesn't reset a
    // user-configured interval on every Kibana restart. Falls back to
    // DEFAULT_REBALANCE_SCHEDULE only on first creation.
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
  }

  private debugLog(message: string) {
    this.serverSetup.logger.debug(`[RebalancePrivateLocationShardsTask] ${message}`);
  }
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
      { error }
    );
  }
};
