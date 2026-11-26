/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import {
  getEntityStoreTaskIds,
  regenerateEntityStoreTaskApiKeys,
} from './regenerate_task_api_keys';
import { entityMaintainersRegistry } from './entity_maintainers/entity_maintainers_registry';

jest.mock('./entity_maintainers/entity_maintainers_registry', () => ({
  entityMaintainersRegistry: { getAll: jest.fn() },
}));

const NAMESPACE = 'default';

const getAllMock = entityMaintainersRegistry.getAll as jest.Mock;

const createTaskWithSchedule = (
  id: string,
  schedule: unknown,
  status = 'idle'
): ConcreteTaskInstance => ({ id, status, schedule } as unknown as ConcreteTaskInstance);

const createTask = (id: string, interval: string, status = 'idle'): ConcreteTaskInstance =>
  createTaskWithSchedule(id, { interval }, status);

const found = (task: ConcreteTaskInstance) => ({ tag: 'ok' as const, value: task });

const notFound = (id: string) => ({
  tag: 'err' as const,
  error: {
    type: 'task',
    id,
    error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
  },
});

describe('regenerateEntityStoreTaskApiKeys', () => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;

  const run = () =>
    regenerateEntityStoreTaskApiKeys({ taskManager, logger, namespace: NAMESPACE, request });

  beforeEach(() => {
    jest.clearAllMocks();
    getAllMock.mockReturnValue([{ id: 'risk-score', interval: '1h' }]);
    taskManager = taskManagerMock.createStart();
    taskManager.bulkGet.mockResolvedValue([]);
    taskManager.bulkUpdateSchedules.mockResolvedValue({ tasks: [], errors: [] });
  });

  describe('getEntityStoreTaskIds', () => {
    it('includes the namespace tasks, every extract task and the registered maintainers', () => {
      const ids = getEntityStoreTaskIds(NAMESPACE);

      expect(ids).toEqual(
        expect.arrayContaining([
          'entity_store:v2:history_snapshot_task:default',
          'entity_store:v2:status_report_task:default',
          'entity_store:v2:resilience_task:default',
          'entity_store:v2:extract_entity_task:user:default',
          'risk-score:default',
        ])
      );
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('regenerates the key without changing the schedule, grouping tasks by interval', async () => {
    const tasks = [
      createTask('extract-user', '1m'),
      createTask('extract-host', '1m'),
      createTask('status', '12h'),
    ];
    taskManager.bulkGet.mockResolvedValue(tasks.map(found));
    taskManager.bulkUpdateSchedules.mockImplementation(async (ids) => ({
      tasks: tasks.filter(({ id }) => ids.includes(id)),
      errors: [],
    }));

    const result = await run();

    expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(2);
    const options = {
      request,
      regenerateApiKey: true,
      cloneApiKey: true,
    };
    expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
      ['extract-user', 'extract-host'],
      { interval: '1m' },
      options
    );
    expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
      ['status'],
      { interval: '12h' },
      options
    );
    expect(result.updated.sort()).toEqual(['extract-host', 'extract-user', 'status']);
    expect(result.failed).toEqual([]);
  });

  it('ignores tasks that do not exist', async () => {
    taskManager.bulkGet.mockResolvedValue([notFound('extract-user'), found(createTask('a', '1m'))]);
    taskManager.bulkUpdateSchedules.mockResolvedValue({
      tasks: [createTask('a', '1m')],
      errors: [],
    });

    const result = await run();

    expect(result).toEqual({ updated: ['a'], failed: [] });
    expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
      ['a'],
      { interval: '1m' },
      expect.anything()
    );
  });

  it('does not call Task Manager when no task exists', async () => {
    taskManager.bulkGet.mockResolvedValue([notFound('a')]);

    const result = await run();

    expect(result).toEqual({ updated: [], failed: [] });
    expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
  });

  it('reports lookup errors other than not found', async () => {
    taskManager.bulkGet.mockResolvedValue([
      {
        tag: 'err',
        error: {
          type: 'task',
          id: 'a',
          error: { error: 'Forbidden', message: 'Nope', statusCode: 403 },
        },
      },
    ]);

    const result = await run();

    expect(result.failed).toEqual([{ id: 'a', message: 'Nope', statusCode: 403 }]);
  });

  it('reports per-task update errors and keeps the tasks that were updated', async () => {
    taskManager.bulkGet.mockResolvedValue([
      found(createTask('a', '1m')),
      found(createTask('b', '1m')),
    ]);
    taskManager.bulkUpdateSchedules.mockResolvedValue({
      tasks: [createTask('a', '1m')],
      errors: [
        {
          type: 'task',
          id: 'b',
          error: { error: 'Conflict', message: 'Version conflict', statusCode: 409 },
        },
      ],
    });

    const result = await run();

    expect(result.updated).toEqual(['a']);
    expect(result.failed).toEqual([{ id: 'b', message: 'Version conflict', statusCode: 409 }]);
  });

  it('reports tasks Task Manager neither updated nor errored on', async () => {
    taskManager.bulkGet.mockResolvedValue([found(createTask('a', '1m', 'failed'))]);

    const result = await run();

    expect(result.updated).toEqual([]);
    expect(result.failed).toEqual([
      { id: 'a', message: 'The task cannot be updated while its status is "failed"' },
    ]);
  });

  it('reports a task without a recurring schedule', async () => {
    taskManager.bulkGet.mockResolvedValue([found(createTaskWithSchedule('a', undefined))]);

    const result = await run();

    expect(result.failed).toEqual([
      { id: 'a', message: 'The task does not have a recurring schedule' },
    ]);
    expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
  });

  describe('rrule schedules', () => {
    const dailyAtNine = { rrule: { freq: 3, interval: 1, tzid: 'UTC', byhour: [9] } };
    // The same schedule with its keys written in a different order.
    const dailyAtNineReordered = { rrule: { byhour: [9], tzid: 'UTC', interval: 1, freq: 3 } };

    it('re-keys a task with its own rrule schedule, apart from interval tasks', async () => {
      const tasks = [
        createTask('interval-task', '1m'),
        createTaskWithSchedule('rrule-task', dailyAtNine),
      ];
      taskManager.bulkGet.mockResolvedValue(tasks.map(found));
      taskManager.bulkUpdateSchedules.mockImplementation(async (ids) => ({
        tasks: tasks.filter(({ id }) => ids.includes(id)),
        errors: [],
      }));

      const result = await run();

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(2);
      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
        ['interval-task'],
        { interval: '1m' },
        expect.anything()
      );
      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
        ['rrule-task'],
        dailyAtNine,
        expect.anything()
      );
      expect(result.updated.sort()).toEqual(['interval-task', 'rrule-task']);
      expect(result.failed).toEqual([]);
    });

    it('updates tasks with the same rrule together, whatever the order of its keys', async () => {
      const tasks = [
        createTaskWithSchedule('a', dailyAtNine),
        createTaskWithSchedule('b', dailyAtNineReordered),
      ];
      taskManager.bulkGet.mockResolvedValue(tasks.map(found));
      taskManager.bulkUpdateSchedules.mockImplementation(async (ids) => ({
        tasks: tasks.filter(({ id }) => ids.includes(id)),
        errors: [],
      }));

      const result = await run();

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
        ['a', 'b'],
        expect.anything(),
        expect.anything()
      );
      expect(result.updated.sort()).toEqual(['a', 'b']);
    });
  });

  it('keeps going when one schedule group fails entirely', async () => {
    taskManager.bulkGet.mockResolvedValue([
      found(createTask('a', '1m')),
      found(createTask('b', '12h')),
    ]);
    taskManager.bulkUpdateSchedules.mockImplementation(async (ids) => {
      if (ids.includes('a')) {
        throw new Error('Could not create API key.');
      }
      return { tasks: [createTask('b', '12h')], errors: [] };
    });

    const result = await run();

    expect(result.updated).toEqual(['b']);
    expect(result.failed).toEqual([{ id: 'a', message: 'Could not create API key.' }]);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not create API key.'));
  });
});
