/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { removeRetiredPrivmonTasks } from './remove_retired_privmon_tasks';

const idsFrom = (start: number, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `task-${start + index}`);

const findPage = (ids: string[]) => ({
  saved_objects: ids.map((id) => ({ id })),
  total: ids.length,
  per_page: 100,
  page: 1,
});

describe('removeRetiredPrivmonTasks', () => {
  const logger = loggingSystemMock.createLogger();
  const find = jest.fn();
  const deleteTask = jest.fn();
  const taskRepo = { find, delete: deleteTask };

  beforeEach(() => {
    jest.clearAllMocks();
    deleteTask.mockResolvedValue({});
  });

  it('deletes every page of leftover documents, not just the first 100', async () => {
    find
      .mockResolvedValueOnce(findPage(idsFrom(0, 100)))
      .mockResolvedValueOnce(findPage(idsFrom(100, 40)));

    const removed = await removeRetiredPrivmonTasks({ taskRepo, logger });

    expect(removed).toBe(140);
    expect(deleteTask).toHaveBeenCalledTimes(140);
    expect(find).toHaveBeenCalledTimes(2);
  });

  it('only asks for the retired task type and only deletes what it found', async () => {
    find.mockResolvedValueOnce(findPage(['task-a', 'task-b']));

    await removeRetiredPrivmonTasks({ taskRepo, logger });

    expect(find).toHaveBeenCalledWith({
      type: 'task',
      filter: 'task.attributes.taskType: "entity_analytics:monitoring:privileges:engine"',
      perPage: 100,
    });
    expect(deleteTask.mock.calls).toEqual([
      ['task', 'task-a'],
      ['task', 'task-b'],
    ]);
  });

  it('does nothing and stays quiet when there are no leftover documents', async () => {
    find.mockResolvedValueOnce(findPage([]));

    const removed = await removeRetiredPrivmonTasks({ taskRepo, logger });

    expect(removed).toBe(0);
    expect(deleteTask).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('ignores documents another node already deleted', async () => {
    find.mockResolvedValueOnce(findPage(['task-a', 'task-b']));
    deleteTask
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'task-a'))
      .mockResolvedValueOnce({});

    const removed = await removeRetiredPrivmonTasks({ taskRepo, logger });

    expect(removed).toBe(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs one warning for a page that fails and stops instead of reading it again', async () => {
    find.mockResolvedValue(findPage(idsFrom(0, 100)));
    deleteTask.mockRejectedValue(new Error('Elasticsearch is unavailable'));

    const removed = await removeRetiredPrivmonTasks({ taskRepo, logger });

    expect(removed).toBe(0);
    expect(find).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete 100 leftover privilege monitoring task document(s)')
    );
  });
});
