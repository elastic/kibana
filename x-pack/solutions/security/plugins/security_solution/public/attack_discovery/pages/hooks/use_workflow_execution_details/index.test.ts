/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';

import { useWorkflowExecutionDetails } from '.';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type {
  AggregatedWorkflowExecution,
  StepExecutionWithLink,
} from '../../loading_callout/types';

jest.mock('@kbn/react-query');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useWorkflowExecutionDetails', () => {
  const mockHttp = {
    fetch: jest.fn(),
  } as unknown as HttpSetup;

  const mockAddError = jest.fn();
  const mockUseQuery = useQuery as jest.Mock;
  const mockUseAppToasts = useAppToasts as jest.Mock;

  const mockWorkflowExecution: WorkflowExecutionDto = {
    context: undefined,
    duration: 1000,
    entryTransactionId: 'transaction-123',
    error: null,
    finishedAt: '2024-01-01T00:01:00Z',
    id: 'run-123',
    isTestRun: false,
    spaceId: 'default',
    startedAt: '2024-01-01T00:00:00Z',
    status: ExecutionStatus.RUNNING,
    stepExecutions: [],
    traceId: 'trace-123',
    workflowDefinition: {
      description: 'Test workflow',
      enabled: true,
      name: 'Test Workflow',
      steps: [],
      triggers: [],
      version: '1',
    },
    workflowId: 'workflow-123',
    workflowName: 'Test Workflow',
    yaml: 'name: Test Workflow',
  };

  const mockWorkflowExecutions: WorkflowExecutionsTracking = {
    alertRetrieval: [
      {
        workflowId: 'alert-retrieval-workflow',
        workflowRunId: 'alert-retrieval-run',
      },
    ],
    generation: {
      workflowId: 'generation-workflow',
      workflowRunId: 'generation-run',
    },
    validation: null,
  };

  const mockStepExecutions: StepExecutionWithLink[] = [
    {
      error: undefined,
      executionTimeMs: 100,
      finishedAt: '2024-01-01T00:00:00Z',
      globalExecutionIndex: 0,
      id: 'step-1',
      input: undefined,
      output: undefined,
      scopeStack: [],
      startedAt: '2024-01-01T00:00:00Z',
      state: undefined,
      status: ExecutionStatus.COMPLETED,
      stepExecutionIndex: 0,
      stepId: 'retrieve_alerts',
      stepType: 'alert_retrieval',
      topologicalIndex: 0,
      workflowId: 'workflow-123',
      workflowRunId: 'run-123',
    },
  ];

  const mockAggregatedExecution: AggregatedWorkflowExecution = {
    status: ExecutionStatus.RUNNING,
    steps: mockStepExecutions,
    workflowExecutions: mockWorkflowExecutions,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppToasts.mockReturnValue({ addError: mockAddError });
  });

  describe('when workflowRunId is provided', () => {
    it('returns data from the query', () => {
      mockUseQuery.mockReturnValue({
        data: mockAggregatedExecution,
        error: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      expect(result.current.data).toEqual(mockAggregatedExecution);
    });

    it('returns error from the query', () => {
      const mockError = new Error('Test error');
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: mockError,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      expect(result.current.error).toEqual(mockError);
    });

    it('returns loading state from the query', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      });

      const { result } = renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('calls useQuery with correct parameters', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          executionUuid: 'execution-123',
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        ['GET', '/api/workflows/executions', 'execution-123', 'run-123'],
        expect.any(Function),
        expect.objectContaining({
          enabled: true,
          refetchInterval: 1000,
          refetchIntervalInBackground: true,
          refetchOnWindowFocus: false,
        })
      );
    });
  });

  describe('when workflowRunId is null', () => {
    it('returns undefined data', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useWorkflowExecutionDetails({
          executionUuid: 'execution-123',
          http: mockHttp,
          workflowRunId: null,
        })
      );

      expect(result.current.data).toBeUndefined();
    });

    it('calls useQuery with enabled false', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          executionUuid: 'execution-123',
          http: mockHttp,
          workflowRunId: null,
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        ['GET', '/api/workflows/executions', 'execution-123'],
        expect.any(Function),
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe('when workflowRunId is undefined', () => {
    it('returns undefined data', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useWorkflowExecutionDetails({
          executionUuid: 'execution-123',
          http: mockHttp,
          workflowRunId: undefined,
        })
      );

      expect(result.current.data).toBeUndefined();
    });

    it('calls useQuery with enabled false', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: false,
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          executionUuid: 'execution-123',
          http: mockHttp,
          workflowRunId: undefined,
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        ['GET', '/api/workflows/executions', 'execution-123'],
        expect.any(Function),
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe('polling behavior', () => {
    it('enables polling when execution is running', () => {
      mockUseQuery.mockReturnValue({
        data: { ...mockAggregatedExecution, status: ExecutionStatus.RUNNING },
        error: undefined,
        isLoading: false,
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          refetchInterval: 1000,
        })
      );
    });

    it('enables polling when execution is pending', () => {
      mockUseQuery.mockReturnValue({
        data: { ...mockAggregatedExecution, status: ExecutionStatus.PENDING },
        error: undefined,
        isLoading: false,
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          refetchInterval: 1000,
        })
      );
    });

    it('calls useQuery with refetchInterval function', () => {
      mockUseQuery.mockReturnValue({
        data: { ...mockAggregatedExecution, status: ExecutionStatus.COMPLETED },
        error: undefined,
        isLoading: false,
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      const callArgs = mockUseQuery.mock.calls[0];
      const options = callArgs[2];

      expect(
        typeof options.refetchInterval === 'number' || typeof options.refetchInterval === 'boolean'
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    it('calls addError when query fails with error message', () => {
      const mockError = {
        body: { message: 'Test error message' },
      };

      let onErrorCallback: ((error: unknown) => void) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        onErrorCallback = options.onError;
        return {
          data: undefined,
          error: mockError,
          isLoading: false,
        };
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      act(() => {
        onErrorCallback?.(mockError);
      });

      expect(mockAddError).toHaveBeenCalledWith(new Error('Test error message'), {
        title: 'Error retrieving workflow execution details',
      });
    });

    it('calls addError when query fails without error message', () => {
      const mockError = {
        body: null,
      };

      let onErrorCallback: ((error: unknown) => void) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        onErrorCallback = options.onError;
        return {
          data: undefined,
          error: mockError,
          isLoading: false,
        };
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      act(() => {
        onErrorCallback?.(mockError);
      });

      expect(mockAddError).toHaveBeenCalledWith(mockError, {
        title: 'Error retrieving workflow execution details',
      });
    });

    it('disables polling when error occurs', () => {
      const mockError = {
        body: { message: 'Test error' },
      };

      let onErrorCallback: ((error: unknown) => void) | undefined;
      let queryOptions: { refetchInterval: number | boolean } | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        onErrorCallback = options.onError;
        queryOptions = options;
        return {
          data: undefined,
          error: mockError,
          isLoading: false,
        };
      });

      const { rerender } = renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      act(() => {
        onErrorCallback?.(mockError);
      });
      rerender();

      expect(queryOptions?.refetchInterval).toBe(false);
    });
  });

  describe('queryFn', () => {
    it('returns undefined when workflowRunId is not provided', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: null,
        })
      );

      const result = await queryFn?.();

      expect(result).toBeUndefined();
    });

    it('returns stubbed execution when workflowRunId starts with stub-', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      mockHttp.fetch = jest.fn();

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          stubData: {
            alertsContextCount: 10,
            discoveriesCount: 2,
            generationStatus: 'started',
          },
          workflowRunId: 'stub-run-123',
        })
      );

      const result = await queryFn?.();

      expect(result?.steps[0]?.workflowRunId).toBe('stub-run-123');
    });

    it('does not call http.fetch when workflowRunId starts with stub-', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      mockHttp.fetch = jest.fn();

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          stubData: {
            generationStatus: 'succeeded',
          },
          workflowRunId: 'stub-run-123',
        })
      );

      await queryFn?.();

      expect(mockHttp.fetch).not.toHaveBeenCalled();
    });

    it('calls http.fetch with correct parameters', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      mockHttp.fetch = jest.fn().mockResolvedValue(mockWorkflowExecution);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: mockWorkflowExecutions,
          workflowId: mockWorkflowExecutions.generation?.workflowId,
          workflowRunId: mockWorkflowExecutions.generation?.workflowRunId,
        })
      );

      await queryFn?.();

      expect(mockHttp.fetch).toHaveBeenCalledWith('/api/workflows/executions/alert-retrieval-run', {
        method: 'GET',
        signal: expect.any(AbortSignal),
      });
      expect(mockHttp.fetch).toHaveBeenCalledWith('/api/workflows/executions/generation-run', {
        method: 'GET',
        signal: expect.any(AbortSignal),
      });
    });

    it('returns workflow execution data from http.fetch', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      mockHttp.fetch = jest.fn().mockResolvedValue(mockWorkflowExecution);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-123',
        })
      );

      const result = await queryFn?.();

      expect(result?.status).toBe(ExecutionStatus.RUNNING);
    });

    it('filters out step_level_timeout steps and preserves pipeline ordering', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const workflowExecutionsWithValidation: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'alert-retrieval-run',
          },
        ],
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run',
        },
        validation: {
          workflowId: 'workflow-validation',
          workflowRunId: 'validation-run',
        },
      };

      const createStepExecution = ({
        executionTimeMs,
        globalExecutionIndex,
        id,
        stepExecutionIndex,
        stepId,
        stepType,
        topologicalIndex,
        workflowId,
        workflowRunId,
      }: {
        executionTimeMs: number;
        globalExecutionIndex: number;
        id: string;
        stepExecutionIndex: number;
        stepId: string;
        stepType: string;
        topologicalIndex: number;
        workflowId: string;
        workflowRunId: string;
      }): WorkflowStepExecutionDto => ({
        error: undefined,
        executionTimeMs,
        finishedAt: '2024-01-01T00:00:01Z',
        globalExecutionIndex,
        id,
        input: undefined,
        output: undefined,
        scopeStack: [],
        startedAt: '2024-01-01T00:00:00Z',
        state: undefined,
        status: ExecutionStatus.COMPLETED,
        stepExecutionIndex,
        stepId,
        stepType,
        topologicalIndex,
        workflowId,
        workflowRunId,
      });

      const alertRetrievalExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'alert-retrieval-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          createStepExecution({
            executionTimeMs: 10,
            globalExecutionIndex: 0,
            id: 'alert-timeout',
            stepExecutionIndex: 0,
            stepId: 'retrieve_alerts',
            stepType: 'step_level_timeout',
            topologicalIndex: 1,
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'alert-retrieval-run',
          }),
          createStepExecution({
            executionTimeMs: 11,
            globalExecutionIndex: 1,
            id: 'alert-real',
            stepExecutionIndex: 1,
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            topologicalIndex: 2,
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'alert-retrieval-run',
          }),
        ],
        workflowId: 'workflow-alert-retrieval',
      };

      const generationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'generation-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          createStepExecution({
            executionTimeMs: 20,
            globalExecutionIndex: 0,
            id: 'gen-timeout',
            stepExecutionIndex: 0,
            stepId: 'generate_discoveries',
            stepType: 'step_level_timeout',
            topologicalIndex: 1,
            workflowId: 'workflow-generation',
            workflowRunId: 'generation-run',
          }),
          createStepExecution({
            executionTimeMs: 21,
            globalExecutionIndex: 1,
            id: 'gen-real',
            stepExecutionIndex: 1,
            stepId: 'generate_discoveries',
            stepType: 'attack-discovery.generate',
            topologicalIndex: 2,
            workflowId: 'workflow-generation',
            workflowRunId: 'generation-run',
          }),
        ],
        workflowId: 'workflow-generation',
      };

      const validationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'validation-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          createStepExecution({
            executionTimeMs: 30,
            globalExecutionIndex: 0,
            id: 'validate-real',
            stepExecutionIndex: 0,
            stepId: 'validate_discoveries',
            stepType: 'attack-discovery.defaultValidation',
            topologicalIndex: 1,
            workflowId: 'workflow-validation',
            workflowRunId: 'validation-run',
          }),
        ],
        workflowId: 'workflow-validation',
      };

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/alert-retrieval-run')) {
          return alertRetrievalExecution;
        }

        if (path.endsWith('/generation-run')) {
          return generationExecution;
        }

        if (path.endsWith('/validation-run')) {
          return validationExecution;
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: workflowExecutionsWithValidation,
          workflowRunId: 'generation-run',
        })
      );

      const result = await queryFn?.();

      const stepTypes = result?.steps.map((s) => s.stepType);
      const stepIds = result?.steps.map((s) => s.stepId);

      expect(stepTypes).toEqual([
        'attack-discovery.defaultAlertRetrieval',
        'attack-discovery.generate',
        'attack-discovery.defaultValidation',
      ]);

      expect(stepIds).toEqual(['retrieve_alerts', 'generate_discoveries', 'validate_discoveries']);
    });

    it('propagates workflowName and workflowDescription from WorkflowExecutionDto to step executions', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const executionWithMetadata: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'run-with-metadata',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 100,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'step-1',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            topologicalIndex: 0,
            workflowId: 'workflow-123',
            workflowRunId: 'run-with-metadata',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          description: 'A workflow that retrieves alerts',
          name: 'Alert Retrieval Workflow',
        },
        workflowId: 'workflow-123',
        workflowName: 'Alert Retrieval Workflow',
      };

      mockHttp.fetch = jest.fn().mockResolvedValue(executionWithMetadata);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-with-metadata',
        })
      );

      const result = await queryFn?.();

      const step = result?.steps.find((s) => s.stepId === 'retrieve_alerts');

      expect(step?.workflowDescription).toBe('A workflow that retrieves alerts');
      expect(step?.workflowName).toBe('Alert Retrieval Workflow');
    });

    it('propagates workflowDescription from workflowDefinition when workflowName is absent', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const executionWithDefinitionOnly: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'run-definition-only',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 100,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'step-1',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            topologicalIndex: 0,
            workflowId: 'workflow-123',
            workflowRunId: 'run-definition-only',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          description: 'Description from definition',
          name: 'Name From Definition',
        },
        workflowId: 'workflow-123',
        workflowName: undefined,
      };

      mockHttp.fetch = jest.fn().mockResolvedValue(executionWithDefinitionOnly);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-definition-only',
        })
      );

      const result = await queryFn?.();

      const step = result?.steps.find((s) => s.stepId === 'retrieve_alerts');

      expect(step?.workflowDescription).toBe('Description from definition');
      expect(step?.workflowName).toBe('Name From Definition');
    });

    it('sets workflowName and workflowDescription to undefined for placeholder steps', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const executionWithOnlyOneStep: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'run-partial',
        status: ExecutionStatus.RUNNING,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 100,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'step-1',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            topologicalIndex: 0,
            workflowId: 'workflow-123',
            workflowRunId: 'run-partial',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          description: 'My workflow description',
          name: 'My Workflow',
          steps: [
            { name: 'retrieve_alerts', type: 'attack-discovery.defaultAlertRetrieval', with: {} },
            { name: 'generate_discoveries', type: 'attack-discovery.generate', with: {} },
          ],
        },
        workflowId: 'workflow-123',
        workflowName: 'My Workflow',
      };

      mockHttp.fetch = jest.fn().mockResolvedValue(executionWithOnlyOneStep);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-partial',
        })
      );

      const result = await queryFn?.();

      const completedStep = result?.steps.find((s) => s.stepId === 'retrieve_alerts');

      expect(completedStep?.workflowName).toBe('My Workflow');
      expect(completedStep?.workflowDescription).toBe('My workflow description');

      // Placeholder step for generate_discoveries also gets workflow metadata via attachWorkflowLink
      const pendingStep = result?.steps.find((s) => s.stepId === 'generate_discoveries');

      expect(pendingStep?.workflowName).toBe('My Workflow');
      expect(pendingStep?.workflowDescription).toBe('My workflow description');
    });

    it('filters out internal wait steps from both definition and executions', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const executionWithWait: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'run-with-wait',
        status: ExecutionStatus.RUNNING,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 0,
            finishedAt: undefined,
            globalExecutionIndex: 0,
            id: 'wait-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.PENDING,
            stepExecutionIndex: 0,
            stepId: 'wait',
            stepType: 'wait',
            topologicalIndex: 0,
            workflowId: 'workflow-123',
            workflowRunId: 'run-with-wait',
          },
          {
            error: undefined,
            executionTimeMs: 10,
            finishedAt: '2024-01-01T00:00:10Z',
            globalExecutionIndex: 1,
            id: 'generate-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 1,
            stepId: 'generate_discoveries',
            stepType: 'attack-discovery.generate',
            topologicalIndex: 1,
            workflowId: 'workflow-123',
            workflowRunId: 'run-with-wait',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          steps: [
            { name: 'wait', type: 'wait', with: {} },
            { name: 'generate_discoveries', type: 'attack-discovery.generate', with: {} },
          ],
        },
      };

      mockHttp.fetch = jest.fn().mockResolvedValue(executionWithWait);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-with-wait',
        })
      );

      const result = await queryFn?.();

      expect(result?.steps.some((s) => s.stepType === 'wait' || s.stepId === 'wait')).toBe(false);
      expect(result?.steps.map((s) => s.stepId)).toEqual([
        'retrieve_alerts',
        'generate_discoveries',
        'validate_discoveries',
      ]);
    });

    it('includes pending placeholder steps from workflowDefinition when stepExecutions are missing them', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const execution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'run-with-missing-steps',
        status: ExecutionStatus.RUNNING,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 11,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'retrieve-alerts-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            topologicalIndex: 0,
            workflowId: 'workflow-123',
            workflowRunId: 'run-with-missing-steps',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          steps: [
            { name: 'retrieve_alerts', type: 'attack-discovery.defaultAlertRetrieval', with: {} },
            { name: 'generate_discoveries', type: 'attack-discovery.generate', with: {} },
            { name: 'validate_discoveries', type: 'attack-discovery.defaultValidation', with: {} },
          ],
        },
      };

      mockHttp.fetch = jest.fn().mockResolvedValue(execution);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-with-missing-steps',
        })
      );

      const result = await queryFn?.();

      const simplified = result?.steps.map(({ status, stepId, stepType }) => ({
        status,
        stepId,
        stepType,
      }));

      expect(simplified).toEqual([
        {
          status: ExecutionStatus.COMPLETED,
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
        },
        {
          status: ExecutionStatus.PENDING,
          stepId: 'generate_discoveries',
          stepType: 'attack-discovery.generate',
        },
        {
          status: ExecutionStatus.PENDING,
          stepId: 'validate_discoveries',
          stepType: 'attack-discovery.defaultValidation',
        },
      ]);
    });

    it('infers terminal placeholder step statuses from workflow status when stepExecutions are empty', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const execution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        duration: 123,
        finishedAt: '2024-01-01T00:00:02Z',
        id: 'run-with-empty-steps',
        startedAt: '2024-01-01T00:00:01Z',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          steps: [
            { name: 'retrieve_alerts', type: 'attack-discovery.defaultAlertRetrieval', with: {} },
            { name: 'generate_discoveries', type: 'attack-discovery.generate', with: {} },
            { name: 'validate_discoveries', type: 'attack-discovery.defaultValidation', with: {} },
          ],
        },
      };

      mockHttp.fetch = jest.fn().mockResolvedValue(execution);

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowRunId: 'run-with-empty-steps',
        })
      );

      const result = await queryFn?.();

      expect(result?.steps.map(({ status, stepId }) => ({ status, stepId }))).toEqual([
        { status: ExecutionStatus.COMPLETED, stepId: 'retrieve_alerts' },
        { status: ExecutionStatus.COMPLETED, stepId: 'generate_discoveries' },
        { status: ExecutionStatus.COMPLETED, stepId: 'validate_discoveries' },
      ]);
    });

    it('includes pending placeholder validation step when validation execution has not started yet', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const workflowExecutionsWithoutValidation: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'alert-retrieval-run',
          },
        ],
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run',
        },
        validation: null,
      };

      const createStepExecution = ({
        id,
        stepId,
        stepType,
        workflowId,
        workflowRunId,
      }: {
        id: string;
        stepId: string;
        stepType: string;
        workflowId: string;
        workflowRunId: string;
      }): WorkflowStepExecutionDto => ({
        error: undefined,
        executionTimeMs: 10,
        finishedAt: '2024-01-01T00:00:01Z',
        globalExecutionIndex: 0,
        id,
        input: undefined,
        output: undefined,
        scopeStack: [],
        startedAt: '2024-01-01T00:00:00Z',
        state: undefined,
        status: ExecutionStatus.COMPLETED,
        stepExecutionIndex: 0,
        stepId,
        stepType,
        topologicalIndex: 0,
        workflowId,
        workflowRunId,
      });

      const alertRetrievalExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'alert-retrieval-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          createStepExecution({
            id: 'retrieve-alerts',
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'alert-retrieval-run',
          }),
        ],
        workflowId: 'workflow-alert-retrieval',
      };

      const generationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'generation-run',
        status: ExecutionStatus.RUNNING,
        stepExecutions: [
          {
            ...createStepExecution({
              id: 'generate-discoveries',
              stepId: 'generate_discoveries',
              stepType: 'attack-discovery.generate',
              workflowId: 'workflow-generation',
              workflowRunId: 'generation-run',
            }),
            status: ExecutionStatus.RUNNING,
          },
        ],
        workflowId: 'workflow-generation',
      };

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/alert-retrieval-run')) {
          return alertRetrievalExecution;
        }

        if (path.endsWith('/generation-run')) {
          return generationExecution;
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: workflowExecutionsWithoutValidation,
          workflowRunId: 'generation-run',
        })
      );

      const result = await queryFn?.();

      expect(result?.steps.map(({ status, stepId }) => ({ status, stepId }))).toEqual([
        { status: ExecutionStatus.COMPLETED, stepId: 'retrieve_alerts' },
        { status: ExecutionStatus.RUNNING, stepId: 'generate_discoveries' },
        { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
      ]);
    });

    it('uses real IDs from workflowExecutions even when workflowRunId is a stub', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      mockHttp.fetch = jest.fn().mockResolvedValue(mockWorkflowExecution);

      // workflowRunId is a stub, but workflowExecutions has real IDs
      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: mockWorkflowExecutions,
          workflowRunId: 'stub-fake-id-123', // stub ID
        })
      );

      await queryFn?.();

      // Should call http.fetch with the real IDs from workflowExecutions
      expect(mockHttp.fetch).toHaveBeenCalledWith('/api/workflows/executions/alert-retrieval-run', {
        method: 'GET',
        signal: expect.any(AbortSignal),
      });
      expect(mockHttp.fetch).toHaveBeenCalledWith('/api/workflows/executions/generation-run', {
        method: 'GET',
        signal: expect.any(AbortSignal),
      });
    });

    it('falls back to stub data only when all IDs are stubs', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      mockHttp.fetch = jest.fn();

      // All IDs in workflowExecutions are stubs
      const allStubWorkflowExecutions: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'alert-retrieval-workflow',
            workflowRunId: 'stub-alert-run',
          },
        ],
        generation: {
          workflowId: 'generation-workflow',
          workflowRunId: 'stub-orch-run',
        },
        validation: null,
      };

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          stubData: {
            alertsContextCount: 10,
            discoveriesCount: 2,
            generationStatus: 'started',
          },
          workflowExecutions: allStubWorkflowExecutions,
          workflowRunId: 'stub-run-123',
        })
      );

      await queryFn?.();

      // Should NOT call http.fetch since all IDs are stubs
      expect(mockHttp.fetch).not.toHaveBeenCalled();
    });

    it('does NOT add a retrieve_alerts placeholder when a custom workflow already covers that pipeline phase', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      // A custom alert retrieval workflow whose steps use different stepIds
      // (e.g. "query_alerts", "format_output") but are tagged with
      // pipelinePhase "retrieve_alerts" via the target metadata.
      const customAlertRetrievalWorkflowExecutions: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'custom-alert-retrieval-workflow',
            workflowRunId: 'custom-alert-retrieval-run',
          },
        ],
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run',
        },
        validation: {
          workflowId: 'workflow-validation',
          workflowRunId: 'validation-run',
        },
      };

      const customAlertRetrievalExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'custom-alert-retrieval-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 50,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'query-alerts-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'query_alerts',
            stepType: 'esql',
            topologicalIndex: 0,
            workflowId: 'custom-alert-retrieval-workflow',
            workflowRunId: 'custom-alert-retrieval-run',
          },
          {
            error: undefined,
            executionTimeMs: 20,
            finishedAt: '2024-01-01T00:00:02Z',
            globalExecutionIndex: 1,
            id: 'format-output-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:01Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 1,
            stepId: 'format_output',
            stepType: 'transform',
            topologicalIndex: 1,
            workflowId: 'custom-alert-retrieval-workflow',
            workflowRunId: 'custom-alert-retrieval-run',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          description: 'Custom ES|QL alert retrieval',
          name: 'Custom Alert Retrieval',
          steps: [
            { name: 'query_alerts', type: 'esql', with: {} },
            { name: 'format_output', type: 'transform', with: {} },
          ],
        },
        workflowId: 'custom-alert-retrieval-workflow',
        workflowName: 'Custom Alert Retrieval',
      };

      const generationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'generation-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 40000,
            finishedAt: '2024-01-01T00:00:42Z',
            globalExecutionIndex: 0,
            id: 'gen-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:02Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'generate_discoveries',
            stepType: 'attack-discovery.generate',
            topologicalIndex: 0,
            workflowId: 'workflow-generation',
            workflowRunId: 'generation-run',
          },
        ],
        workflowId: 'workflow-generation',
      };

      const validationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'validation-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 123,
            finishedAt: '2024-01-01T00:00:43Z',
            globalExecutionIndex: 0,
            id: 'validate-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:42Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'validate_discoveries',
            stepType: 'attack-discovery.defaultValidation',
            topologicalIndex: 0,
            workflowId: 'workflow-validation',
            workflowRunId: 'validation-run',
          },
        ],
        workflowId: 'workflow-validation',
      };

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/custom-alert-retrieval-run')) {
          return customAlertRetrievalExecution;
        }

        if (path.endsWith('/generation-run')) {
          return generationExecution;
        }

        if (path.endsWith('/validation-run')) {
          return validationExecution;
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: customAlertRetrievalWorkflowExecutions,
          workflowRunId: 'generation-run',
        })
      );

      const result = await queryFn?.();

      // The custom workflow steps have pipelinePhase 'retrieve_alerts' but
      // stepIds 'query_alerts' / 'format_output'. No PENDING placeholder
      // with stepId 'retrieve_alerts' should be injected.
      const stepSummary = result?.steps.map(({ status, stepId }) => ({ status, stepId }));

      expect(stepSummary).toEqual([
        { status: ExecutionStatus.COMPLETED, stepId: 'query_alerts' },
        { status: ExecutionStatus.COMPLETED, stepId: 'format_output' },
        { status: ExecutionStatus.COMPLETED, stepId: 'generate_discoveries' },
        { status: ExecutionStatus.COMPLETED, stepId: 'validate_discoveries' },
      ]);

      // Specifically verify there is no retrieve_alerts placeholder
      expect(result?.steps.some((s) => s.stepId === 'retrieve_alerts')).toBe(false);
    });

    it('maintains correct ordering (generation before validation) with 3 alert retrieval workflows', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      // 3 alert retrieval workflows + generation running, no validation yet
      const threeAlertRetrievals: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-legacy',
            workflowRunId: 'legacy-run',
          },
          {
            workflowId: 'workflow-agent-builder',
            workflowRunId: 'agent-builder-run',
          },
          {
            workflowId: 'workflow-esql',
            workflowRunId: 'esql-run',
          },
        ],
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run',
        },
        validation: null,
      };

      const createSimpleExecution = ({
        executionId,
        stepId,
        stepType,
        workflowId,
      }: {
        executionId: string;
        stepId: string;
        stepType: string;
        workflowId: string;
      }): WorkflowExecutionDto => ({
        ...mockWorkflowExecution,
        id: executionId,
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 100,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: `${stepId}-step`,
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId,
            stepType,
            topologicalIndex: 0,
            workflowId,
            workflowRunId: executionId,
          },
        ],
        workflowId,
      });

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/legacy-run')) {
          return createSimpleExecution({
            executionId: 'legacy-run',
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            workflowId: 'workflow-legacy',
          });
        }

        if (path.endsWith('/agent-builder-run')) {
          return createSimpleExecution({
            executionId: 'agent-builder-run',
            stepId: 'ask_agent_for_alerts',
            stepType: 'ai.agent',
            workflowId: 'workflow-agent-builder',
          });
        }

        if (path.endsWith('/esql-run')) {
          return createSimpleExecution({
            executionId: 'esql-run',
            stepId: 'query_alerts',
            stepType: 'elasticsearch.esql.query',
            workflowId: 'workflow-esql',
          });
        }

        if (path.endsWith('/generation-run')) {
          return {
            ...mockWorkflowExecution,
            id: 'generation-run',
            status: ExecutionStatus.RUNNING,
            stepExecutions: [
              {
                error: undefined,
                executionTimeMs: undefined,
                finishedAt: undefined,
                globalExecutionIndex: 0,
                id: 'gen-step',
                input: undefined,
                output: undefined,
                scopeStack: [],
                startedAt: '2024-01-01T00:00:02Z',
                state: undefined,
                status: ExecutionStatus.RUNNING,
                stepExecutionIndex: 0,
                stepId: 'generate_discoveries',
                stepType: 'attack-discovery.generate',
                topologicalIndex: 0,
                workflowId: 'workflow-generation',
                workflowRunId: 'generation-run',
              },
            ],
            workflowId: 'workflow-generation',
          };
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: threeAlertRetrievals,
          workflowRunId: 'generation-run',
        })
      );

      const result = await queryFn?.();

      const stepIds = result?.steps.map((s) => s.stepId);

      // All 3 alert retrieval steps must come first, then generation, then
      // the validation placeholder — never validation before generation.
      expect(stepIds).toEqual([
        'retrieve_alerts',
        'ask_agent_for_alerts',
        'query_alerts',
        'generate_discoveries',
        'validate_discoveries',
      ]);
    });

    it('places generation and validation placeholders after all N alert retrieval steps when N > 2', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      // 3 alert retrieval workflows completed, no generation/validation yet
      const threeAlertRetrievalsOnly: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-legacy',
            workflowRunId: 'legacy-run',
          },
          {
            workflowId: 'workflow-agent-builder',
            workflowRunId: 'agent-builder-run',
          },
          {
            workflowId: 'workflow-esql',
            workflowRunId: 'esql-run',
          },
        ],
        generation: null,
        validation: null,
      };

      const createSimpleExecution = ({
        executionId,
        stepId,
        stepType,
        workflowId,
      }: {
        executionId: string;
        stepId: string;
        stepType: string;
        workflowId: string;
      }): WorkflowExecutionDto => ({
        ...mockWorkflowExecution,
        id: executionId,
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 100,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: `${stepId}-step`,
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId,
            stepType,
            topologicalIndex: 0,
            workflowId,
            workflowRunId: executionId,
          },
        ],
        workflowId,
      });

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/legacy-run')) {
          return createSimpleExecution({
            executionId: 'legacy-run',
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            workflowId: 'workflow-legacy',
          });
        }

        if (path.endsWith('/agent-builder-run')) {
          return createSimpleExecution({
            executionId: 'agent-builder-run',
            stepId: 'ask_agent_for_alerts',
            stepType: 'ai.agent',
            workflowId: 'workflow-agent-builder',
          });
        }

        if (path.endsWith('/esql-run')) {
          return createSimpleExecution({
            executionId: 'esql-run',
            stepId: 'query_alerts',
            stepType: 'elasticsearch.esql.query',
            workflowId: 'workflow-esql',
          });
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: threeAlertRetrievalsOnly,
          workflowRunId: 'legacy-run',
        })
      );

      const result = await queryFn?.();

      const stepIds = result?.steps.map((s) => s.stepId);

      // Both placeholders must come AFTER all 3 alert retrieval steps,
      // and generation must precede validation.
      expect(stepIds).toEqual([
        'retrieve_alerts',
        'ask_agent_for_alerts',
        'query_alerts',
        'generate_discoveries',
        'validate_discoveries',
      ]);

      // Verify that the topologicalIndex of generation < validation
      const genStep = result?.steps.find((s) => s.stepId === 'generate_discoveries');
      const validationStep = result?.steps.find((s) => s.stepId === 'validate_discoveries');

      expect(genStep?.topologicalIndex).toBeLessThan(validationStep?.topologicalIndex ?? 0);

      // Verify both placeholders have indices greater than the last alert retrieval step
      const alertSteps = result?.steps.filter(
        (s) =>
          s.stepId === 'retrieve_alerts' ||
          s.stepId === 'ask_agent_for_alerts' ||
          s.stepId === 'query_alerts'
      );
      const maxAlertIndex = Math.max(...(alertSteps?.map((s) => s.topologicalIndex) ?? []));

      expect(genStep?.topologicalIndex).toBeGreaterThan(maxAlertIndex);
      expect(validationStep?.topologicalIndex).toBeGreaterThan(maxAlertIndex);
    });

    it('adds Generation and Validation placeholders when only custom alert retrieval workflows are available (race condition)', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const onlyCustomAlertRetrieval: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-esql-example',
            workflowRunId: 'esql-example-run',
          },
          {
            workflowId: 'workflow-closed-alerts',
            workflowRunId: 'closed-alerts-run',
          },
        ],
        generation: null,
        validation: null,
      };

      const esqlExampleExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'esql-example-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 29,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'query-alerts-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'query_alerts',
            stepType: 'esql',
            topologicalIndex: 0,
            workflowId: 'workflow-esql-example',
            workflowRunId: 'esql-example-run',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          description: 'Example ES|QL alert retrieval',
          name: 'ES|QL Example Alert Retrieval',
          steps: [{ name: 'query_alerts', type: 'esql', with: {} }],
        },
        workflowId: 'workflow-esql-example',
        workflowName: 'ES|QL Example Alert Retrieval',
      };

      const closedAlertsExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'closed-alerts-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 23,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'closed-alerts-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'query_closed_alerts',
            stepType: 'esql',
            topologicalIndex: 0,
            workflowId: 'workflow-closed-alerts',
            workflowRunId: 'closed-alerts-run',
          },
        ],
        workflowDefinition: {
          ...mockWorkflowExecution.workflowDefinition,
          description: 'Closed alerts last 7 days',
          name: 'Closed Alerts Last 7 Days',
          steps: [{ name: 'query_closed_alerts', type: 'esql', with: {} }],
        },
        workflowId: 'workflow-closed-alerts',
        workflowName: 'Closed Alerts Last 7 Days',
      };

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/esql-example-run')) {
          return esqlExampleExecution;
        }

        if (path.endsWith('/closed-alerts-run')) {
          return closedAlertsExecution;
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: onlyCustomAlertRetrieval,
          workflowRunId: 'esql-example-run',
        })
      );

      const result = await queryFn?.();

      const stepSummary = result?.steps.map(({ status, stepId }) => ({ status, stepId }));

      expect(stepSummary).toEqual([
        { status: ExecutionStatus.COMPLETED, stepId: 'query_alerts' },
        { status: ExecutionStatus.COMPLETED, stepId: 'query_closed_alerts' },
        { status: ExecutionStatus.PENDING, stepId: 'generate_discoveries' },
        { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
      ]);
    });

    it('filters out stub IDs and only fetches real IDs', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn, options) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      mockHttp.fetch = jest.fn().mockResolvedValue(mockWorkflowExecution);

      // Mix of stub and real IDs
      const mixedWorkflowExecutions: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'alert-retrieval-workflow',
            workflowRunId: 'real-alert-run-123', // real ID
          },
        ],
        generation: {
          workflowId: 'generation-workflow',
          workflowRunId: 'stub-orch-run', // stub ID
        },
        validation: null,
      };

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: mixedWorkflowExecutions,
          workflowRunId: 'stub-run-123',
        })
      );

      await queryFn?.();

      // Should only call http.fetch for the real ID
      expect(mockHttp.fetch).toHaveBeenCalledTimes(1);
      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/api/workflows/executions/real-alert-run-123',
        expect.any(Object)
      );
    });

    it('gracefully handles a 404 for a synthetic workflow run ID while still returning data from successful fetches', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const workflowExecutionsWithSyntheticId: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-legacy-alert-retrieval',
            workflowRunId: 'real-alert-retrieval-run',
          },
          {
            workflowId: 'workflow-disabled-custom',
            workflowRunId: 'custom-alert-retrieval-workflow-disabled-custom-execution-uuid-123',
          },
        ],
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run',
        },
        validation: {
          workflowId: 'workflow-validation',
          workflowRunId: 'validation-run',
        },
      };

      const alertRetrievalExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'real-alert-retrieval-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 100,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'retrieve-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            topologicalIndex: 0,
            workflowId: 'workflow-legacy-alert-retrieval',
            workflowRunId: 'real-alert-retrieval-run',
          },
        ],
        workflowId: 'workflow-legacy-alert-retrieval',
      };

      const generationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'generation-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 40000,
            finishedAt: '2024-01-01T00:00:42Z',
            globalExecutionIndex: 0,
            id: 'gen-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:02Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'generate_discoveries',
            stepType: 'attack-discovery.generate',
            topologicalIndex: 0,
            workflowId: 'workflow-generation',
            workflowRunId: 'generation-run',
          },
        ],
        workflowId: 'workflow-generation',
      };

      const validationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'validation-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 123,
            finishedAt: '2024-01-01T00:00:43Z',
            globalExecutionIndex: 0,
            id: 'validate-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:42Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'validate_discoveries',
            stepType: 'attack-discovery.defaultValidation',
            topologicalIndex: 0,
            workflowId: 'workflow-validation',
            workflowRunId: 'validation-run',
          },
        ],
        workflowId: 'workflow-validation',
      };

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/real-alert-retrieval-run')) {
          return alertRetrievalExecution;
        }

        if (path.includes('custom-alert-retrieval-workflow-disabled-custom-execution-uuid-123')) {
          const notFoundError = new Error('Not Found') as Error & {
            response?: { status: number };
          };
          notFoundError.response = { status: 404 };
          throw notFoundError;
        }

        if (path.endsWith('/generation-run')) {
          return generationExecution;
        }

        if (path.endsWith('/validation-run')) {
          return validationExecution;
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: workflowExecutionsWithSyntheticId,
          workflowRunId: 'generation-run',
        })
      );

      const result = await queryFn?.();

      expect(result).toBeDefined();

      const stepIds = result?.steps.map((s) => s.stepId);

      expect(stepIds).toContain('retrieve_alerts');
      expect(stepIds).toContain('generate_discoveries');
      expect(stepIds).toContain('validate_discoveries');
    });

    it('does not reject when a workflow execution fetch returns 404', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const workflowExecutionsWithBadId: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'good-alert-run',
          },
        ],
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'bad-generation-run',
        },
        validation: null,
      };

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/good-alert-run')) {
          return {
            ...mockWorkflowExecution,
            id: 'good-alert-run',
            status: ExecutionStatus.COMPLETED,
            stepExecutions: [
              {
                error: undefined,
                executionTimeMs: 50,
                finishedAt: '2024-01-01T00:00:01Z',
                globalExecutionIndex: 0,
                id: 'step-1',
                input: undefined,
                output: undefined,
                scopeStack: [],
                startedAt: '2024-01-01T00:00:00Z',
                state: undefined,
                status: ExecutionStatus.COMPLETED,
                stepExecutionIndex: 0,
                stepId: 'retrieve_alerts',
                stepType: 'attack-discovery.defaultAlertRetrieval',
                topologicalIndex: 0,
                workflowId: 'workflow-alert-retrieval',
                workflowRunId: 'good-alert-run',
              },
            ],
            workflowId: 'workflow-alert-retrieval',
          };
        }

        if (path.endsWith('/bad-generation-run')) {
          throw new Error('Not Found');
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          workflowExecutions: workflowExecutionsWithBadId,
          workflowRunId: 'bad-generation-run',
        })
      );

      await expect(queryFn?.()).resolves.not.toThrow();
    });

    it('overrides generation step from COMPLETED to FAILED when generationStatus is "failed"', async () => {
      let queryFn: (() => Promise<AggregatedWorkflowExecution | undefined>) | undefined;
      mockUseQuery.mockImplementation((key, fn) => {
        queryFn = fn;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
        };
      });

      const workflowExecutionsWithOrchestrator: WorkflowExecutionsTracking = {
        alertRetrieval: [
          {
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'alert-retrieval-run',
          },
        ],
        generation: {
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run',
        },
        validation: null,
      };

      const alertRetrievalExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'alert-retrieval-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 100,
            finishedAt: '2024-01-01T00:00:01Z',
            globalExecutionIndex: 0,
            id: 'retrieve-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:00Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
            topologicalIndex: 0,
            workflowId: 'workflow-alert-retrieval',
            workflowRunId: 'alert-retrieval-run',
          },
        ],
        workflowId: 'workflow-alert-retrieval',
      };

      const generationExecution: WorkflowExecutionDto = {
        ...mockWorkflowExecution,
        id: 'generation-run',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            error: undefined,
            executionTimeMs: 12,
            finishedAt: '2024-01-01T00:00:42Z',
            globalExecutionIndex: 0,
            id: 'gen-step',
            input: undefined,
            output: undefined,
            scopeStack: [],
            startedAt: '2024-01-01T00:00:02Z',
            state: undefined,
            status: ExecutionStatus.COMPLETED,
            stepExecutionIndex: 0,
            stepId: 'generate_discoveries',
            stepType: 'attack-discovery.generate',
            topologicalIndex: 0,
            workflowId: 'workflow-generation',
            workflowRunId: 'generation-run',
          },
        ],
        workflowId: 'workflow-generation',
      };

      mockHttp.fetch = jest.fn().mockImplementation(async (path: string) => {
        if (path.endsWith('/alert-retrieval-run')) {
          return alertRetrievalExecution;
        }

        if (path.endsWith('/generation-run')) {
          return generationExecution;
        }

        throw new Error(`Unexpected fetch path: ${path}`);
      });

      renderHook(() =>
        useWorkflowExecutionDetails({
          http: mockHttp,
          stubData: {
            generationStatus: 'failed',
          },
          workflowExecutions: workflowExecutionsWithOrchestrator,
          workflowRunId: 'generation-run',
        })
      );

      const result = await queryFn?.();

      expect(result?.steps.map(({ status, stepId }) => ({ status, stepId }))).toEqual([
        { status: ExecutionStatus.COMPLETED, stepId: 'retrieve_alerts' },
        { status: ExecutionStatus.FAILED, stepId: 'generate_discoveries' },
        { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
      ]);
    });
  });
});
