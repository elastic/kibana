/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server/lib/errors';
import { COOLDOWN_MS, refreshCompositeSloSummaries } from './refresh_composite_slo_summaries';

describe('refreshCompositeSloSummaries', () => {
  const logger = {
    debug: jest.fn(),
  } as unknown as Logger;

  const baseConfig = {
    compositeSloSummaryTaskEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns task_disabled when summary task is disabled in config', async () => {
    const result = await refreshCompositeSloSummaries({
      taskManager: {} as any,
      logger,
      config: { ...baseConfig, compositeSloSummaryTaskEnabled: false },
    });
    expect(result).toEqual({ triggered: false, reason: 'task_disabled' });
  });

  it('returns task_not_scheduled when the task SO is missing', async () => {
    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'task',
      'slo:composite-slo-summary-task:1.0.0'
    );

    const taskManager = {
      get: jest.fn().mockRejectedValue(notFoundError),
    };

    const result = await refreshCompositeSloSummaries({
      taskManager: taskManager as any,
      logger,
      config: baseConfig,
    });

    expect(result).toEqual({ triggered: false, reason: 'task_not_scheduled' });
  });

  it('returns cooldown when last trigger is within the cooldown window', async () => {
    const taskManager = {
      get: jest.fn().mockResolvedValue({
        state: {
          lastCompositeListVisitRunSoonAt: Date.now() - COOLDOWN_MS + 60_000,
        },
      }),
    };

    const result = await refreshCompositeSloSummaries({
      taskManager: taskManager as any,
      logger,
      config: baseConfig,
    });

    expect(result).toEqual({ triggered: false, reason: 'cooldown' });
    expect(taskManager.get).toHaveBeenCalled();
  });

  it('returns already_running when runSoon rejects with TaskAlreadyRunningError', async () => {
    const taskManager = {
      get: jest.fn().mockResolvedValue({ state: {} }),
      runSoon: jest
        .fn()
        .mockRejectedValue(new TaskAlreadyRunningError('slo:composite-slo-summary-task:1.0.0')),
      bulkUpdateState: jest.fn(),
    };

    const result = await refreshCompositeSloSummaries({
      taskManager: taskManager as any,
      logger,
      config: baseConfig,
    });

    expect(result).toEqual({ triggered: false, reason: 'already_running' });
    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
  });

  it('calls runSoon and updates task state when allowed', async () => {
    const taskManager = {
      get: jest.fn().mockResolvedValue({ state: {} }),
      runSoon: jest
        .fn()
        .mockResolvedValue({ id: 'slo:composite-slo-summary-task:1.0.0', forced: false }),
      bulkUpdateState: jest.fn().mockResolvedValue(undefined),
    };

    const result = await refreshCompositeSloSummaries({
      taskManager: taskManager as any,
      logger,
      config: baseConfig,
    });

    expect(result).toEqual({ triggered: true });
    expect(taskManager.runSoon).toHaveBeenCalledWith('slo:composite-slo-summary-task:1.0.0');
    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(
      ['slo:composite-slo-summary-task:1.0.0'],
      expect.any(Function)
    );

    const mapFn = taskManager.bulkUpdateState.mock.calls[0][1] as (s: object) => object;
    expect(mapFn({ a: 1 })).toMatchObject({
      a: 1,
      lastCompositeListVisitRunSoonAt: expect.any(Number),
    });
  });
});
