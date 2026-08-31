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

/**
 * Cluster-wide kill-switch, stored on the singleton rebalance task's state —
 * same space-agnostic pattern as the maintenance-windows sync interval
 * (which lives on that task's `schedule`). The task stays scheduled and
 * claimable so a disabled run can still drain leftover agent pins.
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
  await taskManager.bulkUpdateState([REBALANCE_SHARDS_TASK_ID], (state) => ({
    ...state,
    [REBALANCE_SHARDS_ENABLED_STATE_KEY]: enabled,
  }));
  return getRebalancePrivateLocationShardsEnabled(taskManager);
};
