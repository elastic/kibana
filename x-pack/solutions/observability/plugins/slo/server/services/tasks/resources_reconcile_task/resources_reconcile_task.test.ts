/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { LoggerFactory } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SLOResourcesNotInstalled } from '../../../errors';
import type { SLOPluginStartDependencies } from '../../../types';
import type { ResourceInstallState } from '../../resource_install_state';
import { ResourcesReconcileTask, TYPE } from './resources_reconcile_task';

const TASK_ID = `${TYPE}:1.0.0`;

const createTaskInstance = (id: string = TASK_ID) =>
  taskManagerMock.createTask({ id, taskType: TYPE, params: {}, state: {} });

const createStartPlugins = (hasLicense: boolean = true) => {
  const taskManager = taskManagerMock.createStart();
  const licensing = licensingMock.createStart();
  licensing.getLicense.mockResolvedValue(
    licensingMock.createLicense({ license: { type: hasLicense ? 'platinum' : 'basic' } })
  );
  const plugins = { licensing, taskManager } as unknown as SLOPluginStartDependencies;
  return { plugins, taskManager };
};

describe('ResourcesReconcileTask', () => {
  let resourceInstallState: jest.Mocked<Pick<ResourceInstallState, 'reconcile'>>;
  let loggingSystem: ReturnType<typeof loggingSystemMock.create>;
  let task: ResourcesReconcileTask;

  beforeEach(() => {
    resourceInstallState = { reconcile: jest.fn().mockResolvedValue(true) };
    loggingSystem = loggingSystemMock.create();

    task = new ResourcesReconcileTask({
      taskManager: taskManagerMock.createSetup(),
      logFactory: loggingSystem as unknown as LoggerFactory,
      resourceInstallState,
    });
  });

  describe('start', () => {
    it('schedules the task every hour', async () => {
      const { plugins, taskManager } = createStartPlugins();

      await task.start(plugins);

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: TASK_ID, taskType: TYPE, schedule: { interval: '1h' } })
      );
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
      const result = await task.runTask(createTaskInstance(`${TYPE}:0.0.1`));

      expect(result).toEqual({ state: {}, shouldDeleteTask: true });
      expect(resourceInstallState.reconcile).not.toHaveBeenCalled();
    });

    it('reconciles the resources with the task signal', async () => {
      const { signal } = new AbortController();

      const result = await task.runTask(createTaskInstance(), signal);

      expect(resourceInstallState.reconcile).toHaveBeenCalledWith(signal);
      expect(result).toEqual({ state: {} });
    });

    it('logs at debug and completes when another process holds the lock', async () => {
      resourceInstallState.reconcile.mockResolvedValue(false);

      await expect(task.runTask(createTaskInstance())).resolves.toEqual({ state: {} });

      expect(loggingSystemMock.collect(loggingSystem).debug).toContainEqual([
        'SLO resources are being installed by another process',
      ]);
      expect(loggingSystemMock.collect(loggingSystem).warn).toEqual([]);
    });

    it('logs at debug without a warning when the run is cancelled', async () => {
      const abortController = new AbortController();
      abortController.abort();
      resourceInstallState.reconcile.mockRejectedValue(
        new EsErrors.RequestAbortedError('Request aborted')
      );

      await expect(task.runTask(createTaskInstance(), abortController.signal)).resolves.toEqual({
        state: {},
      });

      expect(loggingSystemMock.collect(loggingSystem).debug).toContainEqual([
        'SLO resources reconcile was cancelled',
      ]);
      expect(loggingSystemMock.collect(loggingSystem).warn).toEqual([]);
    });

    it('completes without logging the install failure again when the install fails', async () => {
      resourceInstallState.reconcile.mockRejectedValue(new SLOResourcesNotInstalled('not ready'));

      await expect(task.runTask(createTaskInstance())).resolves.toEqual({ state: {} });

      expect(loggingSystemMock.collect(loggingSystem).warn).toEqual([]);
      expect(loggingSystemMock.collect(loggingSystem).error).toEqual([]);
    });
  });
});
