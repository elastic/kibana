/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import {
  registerLeadGenerationTask,
  startLeadGenerationTask,
  removeLeadGenerationTask,
} from './lead_generation_task';
import { TYPE, VERSION, TIMEOUT, INTERVAL, SCOPE } from './constants';
import { defaultState } from './state';

describe('Lead Generation Task', () => {
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerLeadGenerationTask', () => {
    it('skips registration when taskManager is unavailable', () => {
      registerLeadGenerationTask({
        getStartServices: jest.fn(),
        logger,
        telemetry: {} as never,
        taskManager: undefined,
        experimentalFeatures: { leadGenerationEnabled: true } as never,
        kibanaVersion: '9.0.0',
        config: {} as never,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task Manager is unavailable')
      );
    });

    it('skips registration when feature flag is disabled', () => {
      const mockTaskManager = taskManagerMock.createSetup();

      registerLeadGenerationTask({
        getStartServices: jest.fn(),
        logger,
        telemetry: {} as never,
        taskManager: mockTaskManager,
        experimentalFeatures: { leadGenerationEnabled: false } as never,
        kibanaVersion: '9.0.0',
        config: {} as never,
      });

      expect(mockTaskManager.registerTaskDefinitions).not.toHaveBeenCalled();
    });

    it('registers task definitions when feature flag is enabled', () => {
      const mockTaskManager = taskManagerMock.createSetup();

      registerLeadGenerationTask({
        getStartServices: jest.fn(),
        logger,
        telemetry: {} as never,
        taskManager: mockTaskManager,
        experimentalFeatures: { leadGenerationEnabled: true } as never,
        kibanaVersion: '9.0.0',
        config: {} as never,
      });

      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        [TYPE]: expect.objectContaining({
          title: 'Entity Analytics Lead Generation',
          timeout: TIMEOUT,
          stateSchemaByVersion: expect.any(Object),
          createTaskRunner: expect.any(Function),
        }),
      });
    });
  });

  describe('startLeadGenerationTask', () => {
    it('calls ensureScheduled with correct parameters', async () => {
      const mockTaskManager = taskManagerMock.createStart();
      const namespace = 'test-space';

      await startLeadGenerationTask({
        taskManager: mockTaskManager,
        logger,
        namespace,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith({
        id: `${TYPE}:${namespace}:${VERSION}`,
        taskType: TYPE,
        scope: SCOPE,
        schedule: { interval: INTERVAL },
        state: { ...defaultState, namespace },
        params: { version: VERSION },
      });
    });

    it('logs and rethrows on scheduling error', async () => {
      const mockTaskManager = taskManagerMock.createStart();
      mockTaskManager.ensureScheduled.mockRejectedValueOnce(new Error('scheduling failed'));

      await expect(
        startLeadGenerationTask({
          taskManager: mockTaskManager,
          logger,
          namespace: 'default',
        })
      ).rejects.toThrow('scheduling failed');

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('scheduling failed'));
    });
  });

  describe('removeLeadGenerationTask', () => {
    it('calls removeIfExists with correct task ID', async () => {
      const mockTaskManager = taskManagerMock.createStart();
      const namespace = 'test-space';

      await removeLeadGenerationTask({
        taskManager: mockTaskManager,
        logger,
        namespace,
      });

      expect(mockTaskManager.removeIfExists).toHaveBeenCalledWith(
        `${TYPE}:${namespace}:${VERSION}`
      );
    });

    it('logs success after removal', async () => {
      const mockTaskManager = taskManagerMock.createStart();

      await removeLeadGenerationTask({
        taskManager: mockTaskManager,
        logger,
        namespace: 'default',
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Removed lead generation task')
      );
    });

    it('logs and rethrows on removal error', async () => {
      const mockTaskManager = taskManagerMock.createStart();
      mockTaskManager.removeIfExists.mockRejectedValueOnce(new Error('removal failed'));

      await expect(
        removeLeadGenerationTask({
          taskManager: mockTaskManager,
          logger,
          namespace: 'default',
        })
      ).rejects.toThrow('removal failed');

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('removal failed'));
    });
  });
});
