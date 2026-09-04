/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  REBALANCE_SHARDS_ENABLED_STATE_KEY,
  REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY,
  REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY,
  REBALANCE_SHARDS_TASK_ID,
  getRebalancePrivateLocationShardsEnabled,
  isRebalancePrivateLocationShardsEnabled,
  setRebalancePrivateLocationShardsEnabled,
} from './rebalance_shards_enabled';

describe('rebalance shards enabled setting', () => {
  it('treats a missing or unset state flag as on', () => {
    expect(isRebalancePrivateLocationShardsEnabled(undefined)).toBe(true);
    expect(isRebalancePrivateLocationShardsEnabled({})).toBe(true);
    expect(isRebalancePrivateLocationShardsEnabled({ state: {} })).toBe(true);
    expect(
      isRebalancePrivateLocationShardsEnabled({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true },
      })
    ).toBe(true);
    expect(
      isRebalancePrivateLocationShardsEnabled({
        state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false },
      })
    ).toBe(false);
  });

  it('defaults on when the rebalance task has not been scheduled yet', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('not found'));

    await expect(getRebalancePrivateLocationShardsEnabled(taskManager)).resolves.toBe(true);
  });

  it('reads the live flag from the singleton task state', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({
      state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false },
    } as never);

    await expect(getRebalancePrivateLocationShardsEnabled(taskManager)).resolves.toBe(false);
    expect(taskManager.get).toHaveBeenCalledWith(REBALANCE_SHARDS_TASK_ID);
  });

  it('persists the flag with bulkUpdateState', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({
      state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false },
    } as never);

    await expect(setRebalancePrivateLocationShardsEnabled(taskManager, false)).resolves.toBe(false);
    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(
      [REBALANCE_SHARDS_TASK_ID],
      expect.any(Function)
    );
    const mapper = taskManager.bulkUpdateState.mock.calls[0][1];
    expect(mapper({ keep: 1 }, REBALANCE_SHARDS_TASK_ID)).toEqual({
      keep: 1,
      [REBALANCE_SHARDS_ENABLED_STATE_KEY]: false,
    });
  });

  it('drops the pinsCleared latch when turning the switch back on', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({
      state: { [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true },
    } as never);

    await setRebalancePrivateLocationShardsEnabled(taskManager, true);
    const mapper = taskManager.bulkUpdateState.mock.calls[0][1];
    expect(
      mapper(
        {
          keep: 1,
          [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: true,
          [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 3,
        },
        REBALANCE_SHARDS_TASK_ID
      )
    ).toEqual({
      keep: 1,
      [REBALANCE_SHARDS_ENABLED_STATE_KEY]: true,
      [REBALANCE_SHARDS_PINS_CLEARED_STATE_KEY]: false,
      [REBALANCE_SHARDS_PIN_CLEAR_ATTEMPTS_STATE_KEY]: 0,
    });
  });
});
