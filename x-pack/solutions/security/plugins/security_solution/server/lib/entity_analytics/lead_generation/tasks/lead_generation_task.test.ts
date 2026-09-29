/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

// jest.mock calls are hoisted before imports. Define inline jest.fn() inside
// factories (do NOT reference outer const variables — they are undefined at
// hoist time due to the temporal dead zone).
vi.mock('../run_pipeline', () => {
  const mocked = {
    runLeadGenerationPipeline: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../entity_conversion', () => {
  const mocked = {
    fetchCandidateEntities: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../saved_object', () => {
  const mocked = {
    getLeadGenerationConfig: vi.fn(),
    updateLeadGenerationConfig: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../utils', () => {
  const mocked = {
    resolveChatModel: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../risk_score/risk_score_data_client', () => {
  const mocked = {
    RiskScoreDataClient: vi.fn().mockImplementation(() => ({})),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../risk_score/tasks/helpers', () => {
  const mocked = {
    buildScopedInternalSavedObjectsClientUnsafe: vi.fn().mockReturnValue({}),
  };
  return { ...mocked, default: mocked };
});

import { loggingSystemMock, httpServerMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { isUserError } from '@kbn/task-manager-plugin/server/task_running';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';

import { runLeadGenerationPipeline } from '../run_pipeline';
import { getLeadGenerationConfig, updateLeadGenerationConfig } from '../saved_object';
import { resolveChatModel } from '../utils';

import {
  registerLeadGenerationTask,
  startLeadGenerationTask,
  removeLeadGenerationTask,
} from './lead_generation_task';
import { TYPE, VERSION, TIMEOUT, INTERVAL, SCOPE } from './constants';
import { defaultState } from './state';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from '../../execution_context';

describe('Lead Generation Task', () => {
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerLeadGenerationTask', () => {
    it('skips registration when taskManager is unavailable', () => {
      registerLeadGenerationTask({
        getStartServices: vi.fn(),
        logger,
        telemetry: {} as never,
        taskManager: undefined,
        experimentalFeatures: { leadGenerationEnabled: true } as never,
        kibanaVersion: '9.0.0',
        config: {} as never,
        ml: undefined,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task Manager is unavailable')
      );
    });

    it('skips registration when feature flag is disabled', () => {
      const mockTaskManager = taskManagerMock.createSetup();

      registerLeadGenerationTask({
        getStartServices: vi.fn(),
        logger,
        telemetry: {} as never,
        taskManager: mockTaskManager,
        experimentalFeatures: { leadGenerationEnabled: false } as never,
        kibanaVersion: '9.0.0',
        config: {} as never,
        ml: undefined,
      });

      expect(mockTaskManager.registerTaskDefinitions).not.toHaveBeenCalled();
    });

    it('registers task definitions when feature flag is enabled', () => {
      const mockTaskManager = taskManagerMock.createSetup();

      registerLeadGenerationTask({
        getStartServices: vi.fn(),
        logger,
        telemetry: {} as never,
        taskManager: mockTaskManager,
        experimentalFeatures: { leadGenerationEnabled: true } as never,
        kibanaVersion: '9.0.0',
        config: {} as never,
        ml: undefined,
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
      const request = httpServerMock.createKibanaRequest();

      await startLeadGenerationTask({
        taskManager: mockTaskManager,
        logger,
        namespace,
        request,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        {
          id: `${TYPE}:${namespace}:${VERSION}`,
          taskType: TYPE,
          scope: SCOPE,
          schedule: { interval: INTERVAL },
          state: { ...defaultState, namespace },
          params: { version: VERSION },
        },
        { request }
      );
    });

    it('logs and rethrows on scheduling error', async () => {
      const mockTaskManager = taskManagerMock.createStart();
      const request = httpServerMock.createKibanaRequest();
      mockTaskManager.ensureScheduled.mockRejectedValueOnce(new Error('scheduling failed'));

      await expect(
        startLeadGenerationTask({
          taskManager: mockTaskManager,
          logger,
          namespace: 'default',
          request,
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

  describe('runLeadGenerationTask (via task runner)', () => {
    const namespace = 'default';

    const taskInstance = {
      id: `${TYPE}:${namespace}:${VERSION}`,
      state: { ...defaultState, namespace, runs: 0 },
    } as unknown as ConcreteTaskInstance;

    // Re-created in each beforeEach so clearAllMocks() doesn't wipe return values
    let mockCore: {
      elasticsearch: { client: { asScoped: Mock } };
      executionContext: { withContext: Mock };
    };
    let mockStartPlugins: {
      entityStore: { createCRUDClient: Mock; createRelationshipsClient: Mock };
      inference: object;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedCreateTaskRunner: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockCore = {
        elasticsearch: {
          client: {
            asScoped: vi.fn().mockReturnValue({ asCurrentUser: {} }),
          },
        },
        executionContext: {
          withContext: vi.fn().mockImplementation(<T>(_ctx: unknown, fn: () => T): T => fn()),
        },
      };
      mockStartPlugins = {
        entityStore: {
          createCRUDClient: vi.fn().mockReturnValue({}),
          createRelationshipsClient: vi.fn().mockReturnValue({}),
        },
        inference: {},
      };

      (runLeadGenerationPipeline as Mock).mockResolvedValue(undefined);
      (updateLeadGenerationConfig as Mock).mockResolvedValue(undefined);
      (resolveChatModel as Mock).mockResolvedValue({});

      const mockTaskManager = taskManagerMock.createSetup();
      const getStartServicesMock = vi.fn().mockResolvedValue([mockCore, mockStartPlugins]);

      registerLeadGenerationTask({
        getStartServices: getStartServicesMock,
        logger,
        telemetry: {} as never,
        taskManager: mockTaskManager,
        experimentalFeatures: { leadGenerationEnabled: true } as never,
        kibanaVersion: '9.0.0',
        config: {} as never,
        ml: undefined,
      });

      capturedCreateTaskRunner =
        mockTaskManager.registerTaskDefinitions.mock.calls[0][0][TYPE].createTaskRunner;
    });

    it('returns updated state without running pipeline when cancelled', async () => {
      const fakeRequest = httpServerMock.createKibanaRequest();
      const runner = capturedCreateTaskRunner({ taskInstance, fakeRequest });
      await runner.cancel();
      const result = await runner.run();
      expect(result.state.runs).toEqual(1);
      expect(runLeadGenerationPipeline).not.toHaveBeenCalled();
    });

    it('re-throws USER error when connectorId is missing', async () => {
      (getLeadGenerationConfig as Mock).mockResolvedValueOnce(null);
      const fakeRequest = httpServerMock.createKibanaRequest();
      const runner = capturedCreateTaskRunner({ taskInstance, fakeRequest });
      const err = await runner.run().catch((e: Error) => e);
      expect(err).toBeInstanceOf(Error);
      expect(isUserError(err as Error)).toBe(true);
      expect((err as Error).message).toContain('No connectorId configured');
    });

    it('updates SO with lastError: null after successful pipeline run', async () => {
      (getLeadGenerationConfig as Mock).mockResolvedValueOnce({ connectorId: 'c1' });
      const fakeRequest = httpServerMock.createKibanaRequest();
      const runner = capturedCreateTaskRunner({ taskInstance, fakeRequest });
      await runner.run();
      expect(updateLeadGenerationConfig).toHaveBeenCalledWith(
        expect.anything(),
        namespace,
        expect.objectContaining({ lastError: null, lastExecutionUuid: expect.any(String) })
      );
    });

    it('updates SO with error message and does NOT re-throw on plain pipeline failure', async () => {
      (getLeadGenerationConfig as Mock).mockResolvedValueOnce({ connectorId: 'c1' });
      (runLeadGenerationPipeline as Mock).mockRejectedValueOnce(new Error('LLM timeout'));
      const fakeRequest = httpServerMock.createKibanaRequest();
      const runner = capturedCreateTaskRunner({ taskInstance, fakeRequest });
      await expect(runner.run()).resolves.toBeDefined();
      expect(updateLeadGenerationConfig).toHaveBeenCalledWith(
        expect.anything(),
        namespace,
        expect.objectContaining({ lastError: 'LLM timeout' })
      );
    });

    it('re-throws FRAMEWORK error when fakeRequest is undefined', async () => {
      const runner = capturedCreateTaskRunner({ taskInstance, fakeRequest: undefined });
      await expect(runner.run()).rejects.toThrow('No fakeRequest available in task context');
    });

    it('wraps the task run in coreStart.executionContext.withContext with the expected label and id', async () => {
      (getLeadGenerationConfig as Mock).mockResolvedValueOnce({ connectorId: 'c1' });
      const fakeRequest = httpServerMock.createKibanaRequest();
      const runner = capturedCreateTaskRunner({ taskInstance, fakeRequest });
      await runner.run();

      expect(mockCore.executionContext.withContext).toHaveBeenCalledTimes(1);
      expect(mockCore.executionContext.withContext).toHaveBeenCalledWith(
        buildEaExecutionContext(EA_EXECUTION_CONTEXT_NAMES.LEAD_GENERATION_TASK, taskInstance.id),
        expect.any(Function)
      );
    });
  });
});
