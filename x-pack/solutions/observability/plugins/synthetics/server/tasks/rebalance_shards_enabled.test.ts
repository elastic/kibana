/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  REBALANCE_SHARDS_TASK_ID,
  getRebalancePrivateLocationShardsEnabled,
  isRebalancePrivateLocationShardsEnabled,
  setRebalancePrivateLocationShardsEnabled,
} from './rebalance_shards_enabled';

describe('rebalance shards enabled setting', () => {
  it('treats a missing or unset enabled flag as on', () => {
    expect(isRebalancePrivateLocationShardsEnabled(undefined)).toBe(true);
    expect(isRebalancePrivateLocationShardsEnabled({})).toBe(true);
    expect(isRebalancePrivateLocationShardsEnabled({ enabled: true })).toBe(true);
    expect(isRebalancePrivateLocationShardsEnabled({ enabled: false })).toBe(false);
  });

  it('defaults on when the rebalance task has not been scheduled yet', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('not found'));

    await expect(getRebalancePrivateLocationShardsEnabled(taskManager)).resolves.toBe(true);
  });

  it('reads the live enabled flag from the singleton task', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({ enabled: false } as never);

    await expect(getRebalancePrivateLocationShardsEnabled(taskManager)).resolves.toBe(false);
    expect(taskManager.get).toHaveBeenCalledWith(REBALANCE_SHARDS_TASK_ID);
  });

  it('pauses the task with bulkDisable and resumes with bulkEnable', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({ enabled: false } as never);

    await expect(setRebalancePrivateLocationShardsEnabled(taskManager, false)).resolves.toBe(false);
    expect(taskManager.bulkDisable).toHaveBeenCalledWith([REBALANCE_SHARDS_TASK_ID]);

    taskManager.get.mockResolvedValue({ enabled: true } as never);
    await expect(setRebalancePrivateLocationShardsEnabled(taskManager, true)).resolves.toBe(true);
    expect(taskManager.bulkEnable).toHaveBeenCalledWith([REBALANCE_SHARDS_TASK_ID], true);
  });
});
