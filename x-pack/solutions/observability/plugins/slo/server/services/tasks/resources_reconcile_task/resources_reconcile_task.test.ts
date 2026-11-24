/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, LoggerFactory } from '@kbn/core/server';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { LockManagerService } from '@kbn/lock-manager';
import { LockAcquisitionError } from '@kbn/lock-manager';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { LOCK_ID_RESOURCE_INSTALLER } from '../../../../common/constants';
import type { SLOPluginStartDependencies } from '../../../types';
import { ResourcesReconcileTask, TYPE } from './resources_reconcile_task';

const mockInstall = jest.fn();
jest.mock('../../resource_installer', () => ({
  DefaultResourceInstaller: jest.fn().mockImplementation(() => ({
    install: mockInstall,
  })),
}));

const TASK_ID = `${TYPE}:1.0.0`;

const createTaskInstance = (id: string = TASK_ID): ConcreteTaskInstance => {
  const now = new Date('2026-11-24T00:00:00.000Z');
  return {
    id,
    taskType: TYPE,
    params: {},
    state: {},
    scheduledAt: now,
    attempts: 0,
    status: TaskStatus.Running,
    runAt: now,
    startedAt: now,
    retryAt: null,
    ownerId: null,
  };
};

const createStartPlugins = (hasLicense: boolean = true) => {
  const taskManager = taskManagerMock.createStart();
  const plugins = {
    licensing: {
      getLicense: jest
        .fn()
        .mockResolvedValue({ hasAtLeast: jest.fn().mockReturnValue(hasLicense) }),
    },
    taskManager,
  } as unknown as SLOPluginStartDependencies;
  return { plugins, taskManager };
};

describe('ResourcesReconcileTask', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let lockManager: jest.Mocked<Pick<LockManagerService, 'withLock'>>;
  let loggingSystem: ReturnType<typeof loggingSystemMock.create>;
  let task: ResourcesReconcileTask;

  const run = (taskInstance: ConcreteTaskInstance = createTaskInstance()) =>
    task.runTask(taskInstance, coreSetup as CoreSetup);

  beforeEach(() => {
    jest.clearAllMocks();
    mockInstall.mockResolvedValue(undefined);

    coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([
      {
        elasticsearch: {
          client: { asInternalUser: elasticsearchServiceMock.createElasticsearchClient() },
        },
      } as never,
      {} as never,
      {} as never,
    ]);

    lockManager = { withLock: jest.fn() };
    lockManager.withLock.mockImplementation((_lockId, callback) => callback());
    loggingSystem = loggingSystemMock.create();

    task = new ResourcesReconcileTask({
      core: coreSetup as CoreSetup,
      taskManager: taskManagerMock.createSetup(),
      logFactory: loggingSystem as unknown as LoggerFactory,
      lockManager,
    });
  });

  describe('start', () => {
    it('schedules the task every hour and runs it soon', async () => {
      const { plugins, taskManager } = createStartPlugins();

      await task.start(plugins);

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: TASK_ID, taskType: TYPE, schedule: { interval: '1h' } })
      );
      expect(taskManager.runSoon).toHaveBeenCalledWith(TASK_ID);
    });

    it('does not schedule the task without a platinum license', async () => {
      const { plugins, taskManager } = createStartPlugins(false);

      await task.start(plugins);

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    });
  });

  describe('runTask', () => {
    beforeEach(async () => {
      await task.start(createStartPlugins().plugins);
    });

    it('deletes an outdated task instance', async () => {
      const result = await run(createTaskInstance(`${TYPE}:0.0.1`));

      expect(result).toEqual({ state: {}, shouldDeleteTask: true });
      expect(mockInstall).not.toHaveBeenCalled();
    });

    it('installs the resources under the lock', async () => {
      const result = await run();

      expect(lockManager.withLock).toHaveBeenCalledWith(
        LOCK_ID_RESOURCE_INSTALLER,
        expect.any(Function)
      );
      expect(mockInstall).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ state: {} });
    });

    it('logs at debug and completes when another process holds the lock', async () => {
      lockManager.withLock.mockRejectedValue(new LockAcquisitionError('lock held'));

      await expect(run()).resolves.toEqual({ state: {} });

      expect(loggingSystemMock.collect(loggingSystem).debug).toContainEqual([
        'SLO resources are being installed by another process',
      ]);
      expect(loggingSystemMock.collect(loggingSystem).warn).toEqual([]);
    });

    it('logs a warning and completes when the install fails', async () => {
      mockInstall.mockRejectedValue(new Error('health data stream failed'));

      await expect(run()).resolves.toEqual({ state: {} });

      expect(loggingSystemMock.collect(loggingSystem).warn).toContainEqual([
        'Failed to reconcile SLO resources: health data stream failed',
      ]);
    });
  });
});
