/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SESSIONS_TASK_ID } from '../../../common/sessions';
import { disableSessions } from './disable_sessions';

describe('disableSessions', () => {
  const request = httpServerMock.createKibanaRequest();
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  const disable = () => disableSessions({ taskManager, request });

  beforeEach(() => {
    taskManager = taskManagerMock.createStart();
    taskManager.bulkDisable.mockResolvedValue({ tasks: [], errors: [] });
  });

  it('disables the summaries task, keeping its state and API key', async () => {
    taskManager.get.mockResolvedValue(taskManagerMock.createTask({ id: SESSIONS_TASK_ID }));

    expect(await disable()).toBe(true);
    expect(taskManager.bulkDisable).toHaveBeenCalledWith([SESSIONS_TASK_ID], false, { request });
  });

  it('leaves a task that is already disabled as it is', async () => {
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({ id: SESSIONS_TASK_ID, enabled: false })
    );

    expect(await disable()).toBe(true);
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
  });

  it('is false when sessions were never set up', async () => {
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', SESSIONS_TASK_ID)
    );

    expect(await disable()).toBe(false);
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
  });

  it('throws when the task could not be disabled', async () => {
    taskManager.get.mockResolvedValue(taskManagerMock.createTask({ id: SESSIONS_TASK_ID }));
    taskManager.bulkDisable.mockResolvedValue({
      tasks: [],
      errors: [{ type: 'task', id: SESSIONS_TASK_ID, error: { type: 'conflict', reason: 'x' } }],
    });

    await expect(disable()).rejects.toThrow('Could not turn the summaries task off');
  });
});
