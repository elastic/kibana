/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export const REBALANCE_SHARDS_TASK_TYPE = 'Synthetics:Rebalance-Private-Location-Shards';
export const REBALANCE_SHARDS_TASK_ID = `${REBALANCE_SHARDS_TASK_TYPE}-single-instance`;

/**
 * Cluster-wide kill-switch, stored as Task Manager `enabled` on the singleton
 * rebalance task — same space-agnostic pattern as the maintenance-windows
 * sync interval (which lives on that task's `schedule`). The task document
 * stays scheduled; `bulkDisable` only pauses claiming.
 */
export const isRebalancePrivateLocationShardsEnabled = (task?: { enabled?: boolean }): boolean =>
  task?.enabled !== false;

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
  if (enabled) {
    await taskManager.bulkEnable([REBALANCE_SHARDS_TASK_ID], true);
  } else {
    await taskManager.bulkDisable([REBALANCE_SHARDS_TASK_ID]);
  }
  return getRebalancePrivateLocationShardsEnabled(taskManager);
};
