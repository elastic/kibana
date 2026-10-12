/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  EXECUTIVE_BRIEF_CLEANUP_TASK_ID,
  EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefStore } from '../store/brief_store';
import { registerCleanupBriefsTask, scheduleCleanupBriefsTask } from './cleanup_briefs_task';

// The plugin's jest moduleNameMapper replaces this module with a stub that only has TaskStatus.
jest.mock('@kbn/task-manager-plugin/server', () => {
  const { TaskCost, TaskPriority, TaskStatus } = jest.requireActual(
    '@kbn/task-manager-plugin/server/task'
  );
  const { throwUnrecoverableError } = jest.requireActual(
    '@kbn/task-manager-plugin/server/task_running/errors'
  );
  return { TaskCost, TaskPriority, TaskStatus, throwUnrecoverableError };
});

describe('cleanup briefs task', () => {
  const logger = loggingSystemMock.createLogger();

  const createRunner = (deleteExpired: jest.Mock) => {
    const taskManager = taskManagerMock.createSetup();
    registerCleanupBriefsTask({
      taskManager,
      getBriefStore: async () => ({ deleteExpired } as unknown as BriefStore),
      logger,
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE];
    const signal = new AbortController().signal;
    return {
      signal,
      runner: definition.createTaskRunner({ signal } as unknown as RunContext),
    };
  };

  it('deletes expired briefs with the task abort signal', async () => {
    const deleteExpired = jest.fn().mockResolvedValue(2);
    const { runner, signal } = createRunner(deleteExpired);

    expect(await runner.run()).toEqual({ state: {} });
    expect(deleteExpired).toHaveBeenCalledWith({ abortSignal: signal });
  });

  it('logs and swallows failures', async () => {
    const deleteExpired = jest.fn().mockRejectedValue(new Error('boom'));
    const { runner } = createRunner(deleteExpired);

    expect(await runner.run()).toEqual({ state: {} });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('is scheduled daily with a stable id', async () => {
    const taskManager = taskManagerMock.createStart();
    await scheduleCleanupBriefsTask(taskManager);
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: EXECUTIVE_BRIEF_CLEANUP_TASK_ID,
      taskType: EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE,
      schedule: { interval: '1d' },
      state: {},
      params: {},
    });
  });
});
