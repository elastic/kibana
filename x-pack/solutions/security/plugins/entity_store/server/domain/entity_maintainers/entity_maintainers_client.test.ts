/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityMaintainersClient } from './entity_maintainers_client';
import { loggerMock } from '@kbn/logging-mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { EntityMaintainerTaskStatus } from '../../tasks/entity_maintainers/types';
import type { EntityMaintainerTaskEntry } from '../../tasks/entity_maintainers/types';

jest.mock('../../tasks/entity_maintainers', () => ({
  getTaskId: jest.fn((id: string, namespace: string) => `${id}:${namespace}`),
  removeEntityMaintainer: jest.fn().mockResolvedValue(undefined),
  scheduleEntityMaintainerTask: jest.fn().mockResolvedValue(undefined),
  startEntityMaintainer: jest.fn().mockResolvedValue(undefined),
  stopEntityMaintainer: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../tasks/entity_maintainers/entity_maintainers_registry', () => ({
  entityMaintainersRegistry: {
    hasId: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn().mockReturnValue([]),
    update: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('@kbn/core/server', () => {
  const actual = jest.requireActual('@kbn/core/server');
  return {
    ...actual,
    SavedObjectsErrorHelpers: {
      isNotFoundError: jest.fn().mockReturnValue(false),
    },
  };
});

const {
  getTaskId,
  removeEntityMaintainer,
  scheduleEntityMaintainerTask,
  startEntityMaintainer,
  stopEntityMaintainer,
} = jest.requireMock('../../tasks/entity_maintainers') as {
  getTaskId: jest.MockedFunction<(id: string, namespace: string) => string>;
  removeEntityMaintainer: jest.MockedFunction<
    typeof import('../../tasks/entity_maintainers').removeEntityMaintainer
  >;
  scheduleEntityMaintainerTask: jest.MockedFunction<
    typeof import('../../tasks/entity_maintainers').scheduleEntityMaintainerTask
  >;
  startEntityMaintainer: jest.MockedFunction<
    typeof import('../../tasks/entity_maintainers').startEntityMaintainer
  >;
  stopEntityMaintainer: jest.MockedFunction<
    typeof import('../../tasks/entity_maintainers').stopEntityMaintainer
  >;
};

const { entityMaintainersRegistry } = jest.requireMock(
  '../../tasks/entity_maintainers/entity_maintainers_registry'
) as {
  entityMaintainersRegistry: {
    hasId: jest.MockedFunction<(id: string) => boolean>;
    get: jest.MockedFunction<(id: string) => EntityMaintainerTaskEntry | undefined>;
    getAll: jest.MockedFunction<() => EntityMaintainerTaskEntry[]>;
    update: jest.MockedFunction<(id: string, overrides: unknown) => boolean>;
  };
};

const mockSavedObjectsErrorHelpers = SavedObjectsErrorHelpers as jest.Mocked<
  typeof SavedObjectsErrorHelpers
>;

function createClient(overrides?: {
  taskManager?: Partial<TaskManagerStartContract>;
  namespace?: string;
}) {
  const taskManager = {
    get: jest.fn(),
    ...overrides?.taskManager,
  } as unknown as TaskManagerStartContract;

  return new EntityMaintainersClient({
    logger: loggerMock.create(),
    taskManager,
    namespace: overrides?.namespace ?? 'default',
  });
}

function createMockRequest(): KibanaRequest {
  return {} as KibanaRequest;
}

describe('EntityMaintainersClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedObjectsErrorHelpers.isNotFoundError.mockReturnValue(false);
  });

  describe('start', () => {
    it('should return without starting when id is not in registry', async () => {
      entityMaintainersRegistry.hasId.mockReturnValue(false);
      const client = createClient();
      const request = createMockRequest();

      await client.start('unknown-id', request);

      expect(entityMaintainersRegistry.hasId).toHaveBeenCalledWith('unknown-id');
      expect(startEntityMaintainer).not.toHaveBeenCalled();
      expect(entityMaintainersRegistry.update).not.toHaveBeenCalled();
    });

    it('should start task and update registry to STARTED when id is in registry', async () => {
      entityMaintainersRegistry.hasId.mockReturnValue(true);
      const client = createClient();
      const request = createMockRequest();

      await client.start('maintainer-a', request);

      expect(startEntityMaintainer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'maintainer-a',
          namespace: 'default',
          request,
        })
      );
      expect(entityMaintainersRegistry.update).toHaveBeenCalledWith('maintainer-a', {
        taskStatus: EntityMaintainerTaskStatus.STARTED,
      });
    });

    it('should propagate error and not update registry when startEntityMaintainer throws', async () => {
      entityMaintainersRegistry.hasId.mockReturnValue(true);
      (startEntityMaintainer as jest.Mock).mockRejectedValueOnce(new Error('start failed'));
      const client = createClient();
      const request = createMockRequest();

      await expect(client.start('maintainer-a', request)).rejects.toThrow('start failed');
      expect(entityMaintainersRegistry.update).not.toHaveBeenCalled();
    });
  });

  describe('startAll', () => {
    it('should schedule all registered tasks and update each to STARTED', async () => {
      const entries: EntityMaintainerTaskEntry[] = [
        { id: 'm1', interval: '5m', taskStatus: EntityMaintainerTaskStatus.NOT_STARTED },
        { id: 'm2', interval: '1h', taskStatus: EntityMaintainerTaskStatus.STOPPED },
      ];
      entityMaintainersRegistry.getAll.mockReturnValue(entries);
      const client = createClient();
      const request = createMockRequest();

      await client.startAll(request);

      expect(scheduleEntityMaintainerTask).toHaveBeenCalledTimes(2);
      expect(scheduleEntityMaintainerTask).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'm1', interval: '5m' })
      );
      expect(scheduleEntityMaintainerTask).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'm2', interval: '1h' })
      );
      expect(entityMaintainersRegistry.update).toHaveBeenCalledWith('m1', {
        taskStatus: EntityMaintainerTaskStatus.STARTED,
      });
      expect(entityMaintainersRegistry.update).toHaveBeenCalledWith('m2', {
        taskStatus: EntityMaintainerTaskStatus.STARTED,
      });
    });

    it('should propagate error when any schedule fails', async () => {
      entityMaintainersRegistry.getAll.mockReturnValue([
        { id: 'm1', interval: '5m', taskStatus: EntityMaintainerTaskStatus.NOT_STARTED },
      ]);
      (scheduleEntityMaintainerTask as jest.Mock).mockRejectedValueOnce(
        new Error('schedule failed')
      );
      const client = createClient();
      const request = createMockRequest();

      await expect(client.startAll(request)).rejects.toThrow('schedule failed');
    });
  });

  describe('stop', () => {
    it('should return without stopping when id is not in registry', async () => {
      entityMaintainersRegistry.hasId.mockReturnValue(false);
      const client = createClient();
      const request = createMockRequest();

      await client.stop('unknown-id', request);

      expect(stopEntityMaintainer).not.toHaveBeenCalled();
      expect(entityMaintainersRegistry.update).not.toHaveBeenCalled();
    });

    it('should stop task and update registry to STOPPED when id is in registry', async () => {
      entityMaintainersRegistry.hasId.mockReturnValue(true);
      const client = createClient();
      const request = createMockRequest();

      await client.stop('maintainer-a', request);

      expect(stopEntityMaintainer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'maintainer-a',
          namespace: 'default',
          request,
        })
      );
      expect(entityMaintainersRegistry.update).toHaveBeenCalledWith('maintainer-a', {
        taskStatus: EntityMaintainerTaskStatus.STOPPED,
      });
    });

    it('should propagate error and not update registry when stopEntityMaintainer throws', async () => {
      entityMaintainersRegistry.hasId.mockReturnValue(true);
      (stopEntityMaintainer as jest.Mock).mockRejectedValueOnce(new Error('stop failed'));
      const client = createClient();
      const request = createMockRequest();

      await expect(client.stop('maintainer-a', request)).rejects.toThrow('stop failed');
      expect(entityMaintainersRegistry.update).not.toHaveBeenCalled();
    });
  });

  describe('removeAll', () => {
    it('should remove all registered tasks and update each to STOPPED', async () => {
      const entries: EntityMaintainerTaskEntry[] = [
        { id: 'm1', interval: '5m', taskStatus: EntityMaintainerTaskStatus.STARTED },
        { id: 'm2', interval: '1h', taskStatus: EntityMaintainerTaskStatus.STARTED },
      ];
      entityMaintainersRegistry.getAll.mockReturnValue(entries);
      const client = createClient();

      await client.removeAll();

      expect(entityMaintainersRegistry.getAll).toHaveBeenCalled();
      expect(removeEntityMaintainer).toHaveBeenCalledTimes(2);
      expect(removeEntityMaintainer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'm1', namespace: 'default' })
      );
      expect(removeEntityMaintainer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'm2', namespace: 'default' })
      );
      expect(entityMaintainersRegistry.update).toHaveBeenCalledWith('m1', {
        taskStatus: EntityMaintainerTaskStatus.STOPPED,
      });
      expect(entityMaintainersRegistry.update).toHaveBeenCalledWith('m2', {
        taskStatus: EntityMaintainerTaskStatus.STOPPED,
      });
    });

    it('should propagate error when any remove fails', async () => {
      const entries: EntityMaintainerTaskEntry[] = [
        { id: 'm1', interval: '5m', taskStatus: EntityMaintainerTaskStatus.STARTED },
        { id: 'm2', interval: '1h', taskStatus: EntityMaintainerTaskStatus.STARTED },
      ];
      entityMaintainersRegistry.getAll.mockReturnValue(entries);
      (removeEntityMaintainer as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('remove failed'));
      const client = createClient();

      await expect(client.removeAll()).rejects.toThrow('remove failed');
    });
  });

  describe('getMaintainers', () => {
    it('should return entries from registry with no taskSnapshot when task does not exist (not-found)', async () => {
      entityMaintainersRegistry.getAll.mockReturnValue([
        {
          id: 'm1',
          interval: '5m',
          taskStatus: EntityMaintainerTaskStatus.STARTED,
          description: 'Maintainer one',
        },
      ]);
      const taskManagerGet = jest.fn().mockRejectedValue(new Error('Not found'));
      const client = createClient({ taskManager: { get: taskManagerGet } });
      mockSavedObjectsErrorHelpers.isNotFoundError.mockReturnValue(true);

      const result = await client.getMaintainers();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'm1',
        taskStatus: EntityMaintainerTaskStatus.STARTED,
        interval: '5m',
        description: 'Maintainer one',
        taskSnapshot: undefined,
      });
      expect(getTaskId).toHaveBeenCalledWith('m1', 'default');
      expect(taskManagerGet).toHaveBeenCalledWith('m1:default');
    });

    it('should return entries with taskSnapshot when task exists', async () => {
      entityMaintainersRegistry.getAll.mockReturnValue([
        {
          id: 'm1',
          interval: '5m',
          taskStatus: EntityMaintainerTaskStatus.STARTED,
        },
      ]);
      const taskManagerGet = jest.fn().mockResolvedValue({
        state: {
          metadata: {
            runs: 10,
            lastSuccessTimestamp: '2024-01-15T12:00:00.000Z',
            lastErrorTimestamp: null,
          },
          state: { custom: 'state' },
        },
      });
      const client = createClient({ taskManager: { get: taskManagerGet } });

      const result = await client.getMaintainers();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'm1',
        taskStatus: EntityMaintainerTaskStatus.STARTED,
        interval: '5m',
        taskSnapshot: {
          runs: 10,
          lastSuccessTimestamp: '2024-01-15T12:00:00.000Z',
          lastErrorTimestamp: null,
          state: { custom: 'state' },
        },
      });
    });

    it('should return registry taskStatus and task snapshot independently (task exists but registry status differs)', async () => {
      entityMaintainersRegistry.getAll.mockReturnValue([
        {
          id: 'm1',
          interval: '5m',
          taskStatus: EntityMaintainerTaskStatus.STOPPED,
          description: 'Registry says stopped',
        },
      ]);
      const taskManagerGet = jest.fn().mockResolvedValue({
        state: {
          metadata: {
            runs: 3,
            lastSuccessTimestamp: '2024-01-10T08:00:00.000Z',
            lastErrorTimestamp: null,
          },
          state: { entityCount: 42 },
        },
      });
      const client = createClient({ taskManager: { get: taskManagerGet } });

      const result = await client.getMaintainers();

      expect(result).toHaveLength(1);
      expect(result[0].taskStatus).toBe(EntityMaintainerTaskStatus.STOPPED);
      expect(result[0].taskSnapshot).toEqual({
        runs: 3,
        lastSuccessTimestamp: '2024-01-10T08:00:00.000Z',
        lastErrorTimestamp: null,
        state: { entityCount: 42 },
      });
    });

    it('should propagate non-not-found errors from taskManager.get', async () => {
      entityMaintainersRegistry.getAll.mockReturnValue([
        { id: 'm1', interval: '5m', taskStatus: EntityMaintainerTaskStatus.STARTED },
      ]);
      const taskManagerGet = jest.fn().mockRejectedValue(new Error('ES connection failed'));
      const client = createClient({ taskManager: { get: taskManagerGet } });
      mockSavedObjectsErrorHelpers.isNotFoundError.mockReturnValue(false);

      await expect(client.getMaintainers()).rejects.toThrow('ES connection failed');
    });

    it('should use default runs and timestamps when task state metadata is missing', async () => {
      entityMaintainersRegistry.getAll.mockReturnValue([
        { id: 'm1', interval: '5m', taskStatus: EntityMaintainerTaskStatus.STARTED },
      ]);
      const taskManagerGet = jest.fn().mockResolvedValue({
        state: {
          metadata: undefined,
          state: {},
        },
      });
      const client = createClient({ taskManager: { get: taskManagerGet } });

      const result = await client.getMaintainers();

      expect(result[0].taskSnapshot).toEqual({
        runs: 0,
        lastSuccessTimestamp: null,
        lastErrorTimestamp: null,
        state: {},
      });
    });
  });
});
