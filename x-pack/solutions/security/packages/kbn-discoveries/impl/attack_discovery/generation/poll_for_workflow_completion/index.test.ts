/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';

import { pollForWorkflowCompletion } from '.';

import type { WorkflowsManagementApi } from '../invoke_alert_retrieval_workflow';

describe('pollForWorkflowCompletion', () => {
  const executionId = 'execution-123';
  const spaceId = 'default';

  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const createExecution = (
    status: string,
    stepExecutions: WorkflowStepExecutionDto[] = []
  ): WorkflowExecutionDto =>
    ({
      status,
      stepExecutions,
    } as unknown as WorkflowExecutionDto);

  const createStepExecution = (stepType: string): WorkflowStepExecutionDto =>
    ({
      output: { some: 'data' },
      stepType,
    } as unknown as WorkflowStepExecutionDto);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns when execution is terminal', async () => {
    const workflowsManagementApi: WorkflowsManagementApi = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest.fn().mockResolvedValue(createExecution('completed')),
      runWorkflow: jest.fn(),
    };

    const result = await pollForWorkflowCompletion({
      executionId,
      logger: mockLogger,
      spaceId,
      workflowsManagementApi,
    });

    expect(result.status).toBe('completed');
  });

  it('passes includeOutput: true so step output is available after polling', async () => {
    const workflowsManagementApi: WorkflowsManagementApi = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest.fn().mockResolvedValue(createExecution('completed')),
      runWorkflow: jest.fn(),
    };

    await pollForWorkflowCompletion({
      executionId,
      logger: mockLogger,
      spaceId,
      workflowsManagementApi,
    });

    expect(workflowsManagementApi.getWorkflowExecution).toHaveBeenCalledWith(executionId, spaceId, {
      includeOutput: true,
    });
  });

  it('polls until execution becomes terminal', async () => {
    const workflowsManagementApi: WorkflowsManagementApi = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest
        .fn()
        .mockResolvedValueOnce(createExecution('running'))
        .mockResolvedValueOnce(createExecution('completed')),
      runWorkflow: jest.fn(),
    };

    const promise = pollForWorkflowCompletion({
      executionId,
      logger: mockLogger,
      pollIntervalMs: 500,
      spaceId,
      workflowsManagementApi,
    });

    await jest.advanceTimersByTimeAsync(500);

    const result = await promise;

    expect(result.status).toBe('completed');
  });

  it('throws when execution is not found', async () => {
    const workflowsManagementApi: WorkflowsManagementApi = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest.fn().mockResolvedValue(null),
      runWorkflow: jest.fn(),
    };

    await expect(
      pollForWorkflowCompletion({
        executionId,
        logger: mockLogger,
        spaceId,
        workflowsManagementApi,
      })
    ).rejects.toThrow(`Workflow execution not found: ${executionId}`);
  });

  it('throws when max wait is exceeded', async () => {
    const workflowsManagementApi: WorkflowsManagementApi = {
      getWorkflow: jest.fn(),
      getWorkflowExecution: jest.fn().mockResolvedValue(createExecution('running')),
      runWorkflow: jest.fn(),
    };

    const promise = pollForWorkflowCompletion({
      executionId,
      logger: mockLogger,
      maxWaitMs: 1000,
      pollIntervalMs: 500,
      spaceId,
      workflowsManagementApi,
    });

    const expectation = expect(promise).rejects.toThrow(
      `Workflow timed out after 1000ms (execution: ${executionId})`
    );

    await jest.advanceTimersByTimeAsync(1500);

    await expectation;
  });

  describe('isReady predicate (step metadata race condition workaround)', () => {
    it('returns immediately when terminal and no isReady predicate is provided', async () => {
      const workflowsManagementApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn().mockResolvedValue(createExecution('completed')),
        runWorkflow: jest.fn(),
      };

      const result = await pollForWorkflowCompletion({
        executionId,
        logger: mockLogger,
        spaceId,
        workflowsManagementApi,
      });

      expect(result.status).toBe('completed');
      expect(workflowsManagementApi.getWorkflowExecution).toHaveBeenCalledTimes(1);
    });

    it('returns immediately when terminal and isReady returns true on first poll', async () => {
      const executionWithSteps = createExecution('completed', [
        createStepExecution('attack-discovery.defaultAlertRetrieval'),
      ]);

      const workflowsManagementApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn().mockResolvedValue(executionWithSteps),
        runWorkflow: jest.fn(),
      };

      const isReady = (exec: WorkflowExecutionDto): boolean =>
        exec.stepExecutions.some(
          (step) => step.stepType === 'attack-discovery.defaultAlertRetrieval'
        );

      const result = await pollForWorkflowCompletion({
        executionId,
        isReady,
        logger: mockLogger,
        spaceId,
        workflowsManagementApi,
      });

      expect(result.status).toBe('completed');
      expect(result.stepExecutions).toHaveLength(1);
      expect(workflowsManagementApi.getWorkflowExecution).toHaveBeenCalledTimes(1);
    });

    it('re-polls when terminal but isReady returns false, then returns when isReady passes', async () => {
      const terminalWithoutSteps = createExecution('completed');
      const terminalWithSteps = createExecution('completed', [
        createStepExecution('attack-discovery.defaultAlertRetrieval'),
      ]);

      const workflowsManagementApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest
          .fn()
          .mockResolvedValueOnce(terminalWithoutSteps)
          .mockResolvedValueOnce(terminalWithoutSteps)
          .mockResolvedValueOnce(terminalWithSteps),
        runWorkflow: jest.fn(),
      };

      const isReady = (exec: WorkflowExecutionDto): boolean =>
        exec.stepExecutions.some(
          (step) => step.stepType === 'attack-discovery.defaultAlertRetrieval'
        );

      const promise = pollForWorkflowCompletion({
        executionId,
        isReady,
        logger: mockLogger,
        readinessTimeoutMs: 5000,
        spaceId,
        workflowsManagementApi,
      });

      await jest.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result.stepExecutions).toHaveLength(1);
      expect(workflowsManagementApi.getWorkflowExecution).toHaveBeenCalledTimes(3);
    });

    it('returns the execution as-is when readiness timeout is exceeded', async () => {
      const terminalWithoutSteps = createExecution('completed');

      const workflowsManagementApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn().mockResolvedValue(terminalWithoutSteps),
        runWorkflow: jest.fn(),
      };

      const isReady = (_exec: WorkflowExecutionDto): boolean => false;

      const promise = pollForWorkflowCompletion({
        executionId,
        isReady,
        logger: mockLogger,
        readinessTimeoutMs: 500,
        spaceId,
        workflowsManagementApi,
      });

      await jest.advanceTimersByTimeAsync(600);

      const result = await promise;

      expect(result.status).toBe('completed');
      expect(result.stepExecutions).toHaveLength(0);
    });

    it('logs a warning when readiness timeout is exceeded', async () => {
      const terminalWithoutSteps = createExecution('completed');

      const workflowsManagementApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn().mockResolvedValue(terminalWithoutSteps),
        runWorkflow: jest.fn(),
      };

      const isReady = (_exec: WorkflowExecutionDto): boolean => false;

      const promise = pollForWorkflowCompletion({
        executionId,
        isReady,
        logger: mockLogger,
        readinessTimeoutMs: 500,
        spaceId,
        workflowsManagementApi,
      });

      await jest.advanceTimersByTimeAsync(600);

      await promise;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('step metadata not available after')
      );
    });

    it('returns immediately for failed executions even when isReady returns false', async () => {
      const failedExecution = createExecution('failed');

      const workflowsManagementApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest.fn().mockResolvedValue(failedExecution),
        runWorkflow: jest.fn(),
      };

      const isReady = (exec: WorkflowExecutionDto): boolean =>
        exec.stepExecutions.some(
          (step) => step.stepType === 'attack-discovery.defaultAlertRetrieval'
        );

      const result = await pollForWorkflowCompletion({
        executionId,
        isReady,
        logger: mockLogger,
        spaceId,
        workflowsManagementApi,
      });

      expect(result.status).toBe('failed');
      expect(workflowsManagementApi.getWorkflowExecution).toHaveBeenCalledTimes(1);
    });

    it('uses a shorter polling interval during readiness re-polls', async () => {
      const terminalWithoutSteps = createExecution('completed');
      const terminalWithSteps = createExecution('completed', [
        createStepExecution('attack-discovery.defaultAlertRetrieval'),
      ]);

      const workflowsManagementApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn(),
        getWorkflowExecution: jest
          .fn()
          .mockResolvedValueOnce(terminalWithoutSteps)
          .mockResolvedValueOnce(terminalWithSteps),
        runWorkflow: jest.fn(),
      };

      const isReady = (exec: WorkflowExecutionDto): boolean =>
        exec.stepExecutions.some(
          (step) => step.stepType === 'attack-discovery.defaultAlertRetrieval'
        );

      const promise = pollForWorkflowCompletion({
        executionId,
        isReady,
        logger: mockLogger,
        pollIntervalMs: 500,
        readinessTimeoutMs: 5000,
        spaceId,
        workflowsManagementApi,
      });

      // After 100ms (readiness poll interval), the second poll should have fired
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.stepExecutions).toHaveLength(1);
      expect(workflowsManagementApi.getWorkflowExecution).toHaveBeenCalledTimes(2);
    });
  });
});
