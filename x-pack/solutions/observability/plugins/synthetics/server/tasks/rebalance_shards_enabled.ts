/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export const REBALANCE_SHARDS_TASK_TYPE = 'Synthetics:Rebalance-Private-Location-Shards';
export const REBALANCE_SHARDS_TASK_ID = `${REBALANCE_SHARDS_TASK_TYPE}-single-instance`;
export const REBALANCE_SHARDS_ENABLED_STATE_KEY = 'rebalancePrivateLocationShardsEnabled';
export const REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY = 'pinsCleared';
export const REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY = 'pinClearAttempts';
export const REBALANCE_SHARDS_SENTINELS_STATE_KEY = 'shardSentinels';

/**
 * Per private location id: the agent policy revision that first contained the
 * location's shard sentinel, and whether every healthy agent has applied it.
 * Monitors at a location are pinned to agents only once `ready` is true.
 */
export interface ShardSentinelState {
  agentPolicyId: string;
  revision: number;
  ready: boolean;
}

export type ShardSentinelStates = Record<string, ShardSentinelState>;

/**
 * Cluster-wide kill-switch, stored on the singleton rebalance task's state —
 * same space-agnostic pattern as `disableAutoSync` on the private-location
 * sync task. The task stays scheduled and claimable so a disabled run can
 * still drain leftover agent pins.
 */
export const isRebalancePrivateLocationShardsEnabled = (task?: {
  state?: Record<string, unknown>;
}): boolean => task?.state?.[REBALANCE_SHARDS_ENABLED_STATE_KEY] !== false;

export const getRebalancePrivateLocationShardsEnabled = async (
  taskManager: TaskManagerStartContract
): Promise<boolean> => {
  try {
    const task = await taskManager.get(REBALANCE_SHARDS_TASK_ID);
    return isRebalancePrivateLocationShardsEnabled(task);
  } catch {
    return true;
  }
};

export const setRebalancePrivateLocationShardsEnabled = async (
  taskManager: TaskManagerStartContract,
  enabled: boolean
): Promise<boolean> => {
  await taskManager.bulkUpdateState([REBALANCE_SHARDS_TASK_ID], (state) => {
    const next: Record<string, unknown> = {
      ...state,
      [REBALANCE_SHARDS_ENABLED_STATE_KEY]: enabled,
    };
    // Turning on must drop the drain latch so a later off run scans again
    // for pins stamped while the switch was on.
    if (enabled) {
      next[REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY] = false;
      next[REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY] = 0;
    }
    return next;
  });
  return getRebalancePrivateLocationShardsEnabled(taskManager);
};

export const getShardSentinelStates = (task?: {
  state?: Record<string, unknown>;
}): ShardSentinelStates =>
  (task?.state?.[REBALANCE_SHARDS_SENTINELS_STATE_KEY] as ShardSentinelStates | undefined) ?? {};

/** A state recorded for a previous agent policy of the location does not count. */
export const isShardSentinelReady = (
  states: ShardSentinelStates,
  location: { id: string; agentPolicyId: string }
): boolean => {
  const state = states[location.id];
  return state?.ready === true && state.agentPolicyId === location.agentPolicyId;
};

/** Reads the sentinel states; an unreadable task counts as no location ready. */
export const readShardSentinelStates = async (
  taskManager: TaskManagerStartContract
): Promise<ShardSentinelStates> => {
  try {
    return getShardSentinelStates(await taskManager.get(REBALANCE_SHARDS_TASK_ID));
  } catch {
    return {};
  }
};
