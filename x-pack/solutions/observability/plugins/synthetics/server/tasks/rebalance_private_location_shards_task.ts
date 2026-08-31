/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  RunContext,
} from '@kbn/task-manager-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import pRetry from 'p-retry';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { isConditionShardedLocation } from '../synthetics_service/private_location/assign_by_condition';
import { getAgentInfo } from '../synthetics_service/private_location/get_agent_info';
import { getRecentlyActiveAgentIds } from '../synthetics_service/private_location/get_active_agent_ids';
import {
  isCheckinStale,
  planLocationRebalance,
  STALE_DATA_MS,
} from '../synthetics_service/private_location/plan_rebalance';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import type { SyntheticsServerSetup } from '../types';
import {
  isRebalancePrivateLocationShardsEnabled,
  REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY,
  REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY,
  REBALANCE_SHARDS_TASK_ID,
  REBALANCE_SHARDS_TASK_TYPE,
} from './rebalance_shards_enabled';

export { REBALANCE_SHARDS_TASK_ID };
export const DEFAULT_REBALANCE_SCHEDULE = '1m';
export const MAX_PIN_CLEAR_ATTEMPTS = 3;

const PIN_DRAIN_RESET = {
  [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: false,
  [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 0,
} as const;

interface RebalanceTaskState extends Record<string, unknown> {
  /**
   * `${agentPolicyId}:${agentId}` → epoch ms when the agent's current healthy
   * streak began. Persisted across runs to drive the recovery hysteresis (see
   * {@link planLocationRebalance}); agents not healthy on a run drop out so their
   * streak restarts next time they recover.
   */
  healthySince?: Record<string, number>;
  /**
   * True after a disabled cycle finished draining with no failed writes.
   * Reset when the switch turns back on.
   */
  pinsCleared?: boolean;
  /**
   * Consecutive failed drain attempts while the switch is off. Stops retrying
   * after MAX_PIN_CLEAR_ATTEMPTS; reset when the switch turns back on.
   */
  pinClearAttempts?: number;
}

/**
 * Keeps monitor→agent assignment aligned with the set of healthy agents for
 * scalable (condition-sharded) private locations, by rewriting each moved
 * monitor's `${agent.id}` condition. Intentionally separate from the already
 * overloaded `Synthetics:Sync-Private-Location-Monitors` task: it runs on its
 * own tighter interval and only ever touches condition-sharded locations.
 */
export class RebalancePrivateLocationShardsTask {
  constructor(
    private readonly serverSetup: SyntheticsServerSetup,
    private readonly syntheticsMonitorClient: SyntheticsMonitorClient
  ) {}

  registerTaskDefinition(taskManager: TaskManagerSetupContract) {
    taskManager.registerTaskDefinitions({
      [REBALANCE_SHARDS_TASK_TYPE]: {
        title: 'Synthetics Rebalance Private Location Shards Task',
        description:
          'Reassigns monitors across the healthy agents of scalable private locations (by rewriting per-monitor agent conditions) for at-most-once execution and failover.',
        timeout: '10m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, signal }: RunContext) => ({
          run: async () => this.runTask({ taskInstance, signal }),
        }),
      },
    });
  }

  async runTask({
    taskInstance,
    signal,
  }: {
    taskInstance: ConcreteTaskInstance;
    signal: AbortSignal;
  }): Promise<{
    state: Record<string, unknown>;
    schedule?: IntervalSchedule;
  }> {
    const { coreStart, logger } = this.serverSetup;
    const interval =
      (taskInstance.schedule as IntervalSchedule | undefined)?.interval ??
      DEFAULT_REBALANCE_SCHEDULE;
    const schedule = { interval };

    try {
      signal.throwIfAborted();
      if (!isRebalancePrivateLocationShardsEnabled(taskInstance)) {
        return {
          state: await this.runDisabledDrain(taskInstance),
          schedule,
        };
      }

      const soClient = coreStart.savedObjects.createInternalRepository();

      const scalableLocations = (await getPrivateLocations(soClient, ALL_SPACES_ID)).filter(
        isConditionShardedLocation
      );

      if (scalableLocations.length === 0) {
        return {
          state: await this.returnedState(taskInstance, PIN_DRAIN_RESET),
          schedule,
        };
      }

      const now = Date.now();
      // Carry each agent's healthy streak across runs so a recovered agent only
      // becomes recovery-eligible after RECOVERY_STABILITY_MS. Rebuilt each run
      // from the currently-healthy agents; a dropped agent is forgotten so its
      // streak restarts on the next recovery.
      const priorHealthySince = (taskInstance.state as RebalanceTaskState).healthySince ?? {};
      const nextHealthySince: Record<string, number> = {};

      for (const location of scalableLocations) {
        signal.throwIfAborted();
        try {
          const agents = await getAgentInfo(this.serverSetup, location.agentPolicyId, signal);

          // Data-plane liveness veto: only worth a `synthetics-*` query when at
          // least one agent looks stale by check-in. In steady state (all fresh)
          // we skip it, so a healthy location adds no extra ES load.
          const hasStaleAgent = [...agents.values()].some((info) => isCheckinStale(info, now));
          const activeAgentIds = hasStaleAgent
            ? await getRecentlyActiveAgentIds(
                this.serverSetup,
                [...agents.keys()],
                STALE_DATA_MS,
                now,
                signal
              )
            : undefined;

          const {
            healthyAgentIds,
            recoveryAgentIds,
            capacities,
            nextHealthySince: locationHealthySince,
          } = planLocationRebalance({
            agents,
            now,
            priorHealthySince,
            agentPolicyId: location.agentPolicyId,
            activeAgentIds,
          });
          // Keys are policy-scoped, so merging every location into one map is safe.
          Object.assign(nextHealthySince, locationHealthySince);

          if (healthyAgentIds.length === 0) {
            // Leave monitors pinned where they are rather than break at-most-once:
            // with no healthy target there is nowhere safe to move them to.
            logger.warn(
              `[RebalancePrivateLocationShardsTask] No healthy agents for private location ${location.id} (${location.label}); skipping rebalance.`
            );
            continue;
          }

          this.debugLog(
            `location ${location.id}: healthy=${healthyAgentIds.length}/${agents.size}, recovery-eligible=${recoveryAgentIds.length}`
          );

          // Idempotent placement + diff-based writes: only monitors whose assigned
          // agent changed are rewritten; steady state performs zero writes.
          const { total, moved } =
            await this.syntheticsMonitorClient.privateLocationAPI.rebalanceShards({
              location: {
                id: location.id,
                label: location.label,
                agentPolicyId: location.agentPolicyId,
              },
              healthyAgentIds,
              recoveryAgentIds,
              capacities,
              signal,
            });
          this.debugLog(`location ${location.id}: moved ${moved}/${total} monitor(s)`);
        } catch (e) {
          if (signal.aborted) {
            throw e;
          }
          this.debugLog(`Rebalance failed for location ${location.id}; skipping: ${e.message}`);
        }
      }

      return {
        state: await this.returnedState(taskInstance, {
          healthySince: nextHealthySince,
          ...PIN_DRAIN_RESET,
        }),
        schedule,
      };
    } catch (error) {
      // TM discards run() result on abort; returning state would be a no-op.
      if (signal.aborted) {
        throw error;
      }
      logger.error(
        `[RebalancePrivateLocationShardsTask] Rebalance of private location shards failed: ${error.message}`
      );
    }

    return { state: await this.returnedState(taskInstance), schedule };
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
      taskType: REBALANCE_SHARDS_TASK_TYPE,
      params: {},
    });
    // Earlier iterations stored the kill-switch on `task.enabled`. This task
    // must stay claimable so a disabled cycle can drain leftover agent pins.
    await taskManager.bulkEnable([REBALANCE_SHARDS_TASK_ID], false);
    this.debugLog('Rebalance private location shards task scheduled');
  }

  /**
   * While off: drain leftover pins once, then skip Fleet listing until the
   * switch turns back on. Failed writes retry up to MAX_PIN_CLEAR_ATTEMPTS,
   * then stop until the next on→off. A mid-run PUT true drops the latch.
   */
  private async runDisabledDrain(
    taskInstance: ConcreteTaskInstance
  ): Promise<Record<string, unknown>> {
    const attemptsSoFar =
      Number(taskInstance.state[REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]) || 0;

    if (taskInstance.state[REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY] === true) {
      this.debugLog('disabled; pins already cleared');
      return this.returnedState(taskInstance);
    }
    if (attemptsSoFar >= MAX_PIN_CLEAR_ATTEMPTS) {
      this.debugLog('disabled; pin drain retries exhausted');
      return this.returnedState(taskInstance);
    }

    let cleared = 0;
    let failed = 0;
    try {
      const result = await this.syntheticsMonitorClient.privateLocationAPI.clearShardConditions();
      cleared = result.cleared;
      failed = result.failed ?? 0;
      this.debugLog(`disabled; cleared ${cleared} agent pin(s)`);
    } catch (error) {
      failed = 1;
      const message = error instanceof Error ? error.message : String(error);
      this.serverSetup.logger.warn(
        `[RebalancePrivateLocationShardsTask] disabled; pin drain failed: ${message}`
      );
    }

    const live = await this.returnedState(taskInstance);
    if (isRebalancePrivateLocationShardsEnabled({ state: live })) {
      return { ...live, ...PIN_DRAIN_RESET };
    }
    if (failed > 0) {
      const attempts = attemptsSoFar + 1;
      if (attempts >= MAX_PIN_CLEAR_ATTEMPTS) {
        this.serverSetup.logger.warn(
          `[RebalancePrivateLocationShardsTask] disabled; pin drain failed after ${MAX_PIN_CLEAR_ATTEMPTS} attempts, giving up until the setting is turned back on`
        );
      }
      return { ...live, [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: attempts };
    }
    return {
      ...live,
      [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: true,
      [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 0,
    };
  }

  // Re-read: TM persists run() state and would clobber a mid-run bulkUpdateState PUT.
  private async returnedState(
    taskInstance: ConcreteTaskInstance,
    patch: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    let liveState: Record<string, unknown> = taskInstance.state;
    try {
      const live = await this.serverSetup.pluginsStart.taskManager.get(REBALANCE_SHARDS_TASK_ID);
      if (live?.state) {
        liveState = live.state;
      }
    } catch {
      // claimed instance is the best we have
    }
    return { ...liveState, ...patch };
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
