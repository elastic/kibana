/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { MOBILE_SESSIONS_TASK_ID, SESSIONS_TASK_ID } from '../../../common/sessions';
import { disableSessions } from './disable_sessions';

describe('disableSessions', () => {
  const request = httpServerMock.createKibanaRequest();
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  const disable = () => disableSessions({ taskManager, request });

  /** The tasks by id, with the others not scheduled. */
  const mockTasks = (tasks: Record<string, Partial<ConcreteTaskInstance>>) =>
    taskManager.get.mockImplementation(async (id) => {
      if (!tasks[id]) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError('task', id);
      }
      return taskManagerMock.createTask({ id, ...tasks[id] });
    });

  beforeEach(() => {
    taskManager = taskManagerMock.createStart();
    taskManager.bulkDisable.mockResolvedValue({ tasks: [], errors: [] });
  });

  it('disables every summaries task, keeping their state and API keys', async () => {
    mockTasks({ [SESSIONS_TASK_ID]: {}, [MOBILE_SESSIONS_TASK_ID]: {} });

    expect(await disable()).toBe(true);
    expect(taskManager.bulkDisable).toHaveBeenCalledWith(
      [SESSIONS_TASK_ID, MOBILE_SESSIONS_TASK_ID],
      false,
      { request }
    );
  });

  it('disables only the tasks that are scheduled and still running', async () => {
    mockTasks({ [SESSIONS_TASK_ID]: {}, [MOBILE_SESSIONS_TASK_ID]: { enabled: false } });

    expect(await disable()).toBe(true);
    expect(taskManager.bulkDisable).toHaveBeenCalledWith([SESSIONS_TASK_ID], false, { request });
  });

  it('disables the browser task when the mobile one was never scheduled', async () => {
    mockTasks({ [SESSIONS_TASK_ID]: {} });

    expect(await disable()).toBe(true);
    expect(taskManager.bulkDisable).toHaveBeenCalledWith([SESSIONS_TASK_ID], false, { request });
  });

  it('leaves tasks that are already disabled as they are', async () => {
    mockTasks({
      [SESSIONS_TASK_ID]: { enabled: false },
      [MOBILE_SESSIONS_TASK_ID]: { enabled: false },
    });

    expect(await disable()).toBe(true);
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
  });

  it('is false when sessions were never set up', async () => {
    mockTasks({});

    expect(await disable()).toBe(false);
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
  });

  it('throws when a task could not be disabled', async () => {
    mockTasks({ [SESSIONS_TASK_ID]: {} });
    taskManager.bulkDisable.mockResolvedValue({
      tasks: [],
      errors: [{ type: 'task', id: SESSIONS_TASK_ID, error: { type: 'conflict', reason: 'x' } }],
    });

    await expect(disable()).rejects.toThrow('Could not turn the summaries task off');
  });
});
