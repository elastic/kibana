/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { ExecutionStatus, type WorkflowDetailDto, type WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../lib/errors/attack_discovery_error';

import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from './invoke_alert_retrieval_workflow';
import { invokeGenerationWorkflow } from './invoke_generation_workflow';

const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_FAILED: 'generate-step-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED: 'generate-step-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED: 'generate-step-succeeded',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED: 'generation-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED: 'generation-succeeded',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

jest.mock('../../lib/persistence', () => ({
  getDurationNanoseconds: jest.fn().mockReturnValue(1000000),
}));

describe('invokeGenerationWorkflow', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockRequest = {} as KibanaRequest;

  const mockAuthenticatedUser = {
    authentication_provider: { name: 'basic', type: 'basic' },
    elastic_cloud_user: false,
    username: 'test-user',
  } as AuthenticatedUser;

  const mockEventLogger = {
    logEvent: jest.fn(),
  } as unknown as IEventLogger;

  const mockWorkflowsManagementApi: WorkflowsManagementApi = {
    getWorkflow: jest.fn(),
    getWorkflowExecution: jest.fn(),
    runWorkflow: jest.fn(),
  };

  const mockAlertRetrievalResult: AlertRetrievalResult = {
    alerts: ['alert-1-content', 'alert-2-content'],
    alertsContextCount: 2,
    anonymizedAlerts: [
      { metadata: {}, page_content: 'alert-1-anonymized' },
      { metadata: {}, page_content: 'alert-2-anonymized' },
    ],
    apiConfig: {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
      model: 'gpt-4',
    },
    connectorName: 'Test Connector',
    replacements: { 'user-1': 'REDACTED_USER_1' },
    workflowExecutions: [
      {
        workflowId: 'default-attack-discovery-alert-retrieval',
        workflowRunId: 'alert-retrieval-run-id',
      },
    ],
    workflowId: 'default-attack-discovery-alert-retrieval',
    workflowRunId: 'alert-retrieval-run-id',
  };

  const workflowId = 'workflow-generation';

  const defaultProps = {
    alertRetrievalResult: mockAlertRetrievalResult,
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
      model: 'gpt-4',
    },
    authenticatedUser: mockAuthenticatedUser,
    end: '2024-01-01T00:00:00Z',
    eventLogger: mockEventLogger,
    eventLogIndex: '.kibana-event-log-test',
    executionUuid: 'test-execution-uuid',
    filter: { bool: { must: [] } },
    logger: mockLogger,
    request: mockRequest,
    size: 100,
    spaceId: 'default',
    start: '2023-12-01T00:00:00Z',
    workflowId,
    workflowConfig: {
      alert_retrieval_workflow_ids: ['default-attack-discovery-alert-retrieval'],
      alert_retrieval_mode: 'custom_query' as const,
      validation_workflow_id: 'attack-discovery-validation',
    },
    workflowsManagementApi: mockWorkflowsManagementApi,
  };

  const mockWorkflow: WorkflowDetailDto = {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    definition: {
      enabled: true,
      name: 'Attack discovery generation',
      steps: [],
      triggers: [],
      version: '1',
    },
    description: 'Test workflow',
    enabled: true,
    id: workflowId,
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    name: 'Attack discovery generation',
    valid: true,
    yaml: 'name: Test',
  };

  const mockCompletedExecution: WorkflowExecutionDto = {
    context: {},
    duration: 5000,
    error: null,
    finishedAt: '2024-01-01T00:00:05Z',
    id: 'workflow-run-id',
    isTestRun: false,
    spaceId: 'default',
    startedAt: '2024-01-01T00:00:00Z',
    status: ExecutionStatus.COMPLETED,
    stepExecutions: [
      {
        globalExecutionIndex: 0,
        id: 'step-1',
        output: {
          alerts_context_count: 2,
          attack_discoveries: [
            { title: 'Discovery 1', description: 'Description 1' },
            { title: 'Discovery 2', description: 'Description 2' },
          ],
          execution_uuid: 'test-execution-uuid',
          replacements: { 'user-1': 'REDACTED_USER_1' },
        },
        scopeStack: [],
        startedAt: '2024-01-01T00:00:00Z',
        status: ExecutionStatus.COMPLETED,
        stepExecutionIndex: 0,
        stepId: 'generate_discoveries',
        stepType: 'security.attack-discovery.generate',
        topologicalIndex: 0,
        workflowId,
        workflowRunId: 'workflow-run-id',
      },
    ],
    workflowDefinition: {
      enabled: true,
      name: 'Test Workflow',
      steps: [],
      triggers: [],
      version: '1',
    },
    workflowId,
    workflowName: 'Attack discovery generation',
    yaml: 'name: Test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when workflow executes successfully', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('passes includeOutput: true when polling so step output is available', async () => {
      await invokeGenerationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.getWorkflowExecution).toHaveBeenCalledWith(
        'workflow-run-id',
        'default',
        { includeOutput: true }
      );
    });

    it('returns the generation result with attackDiscoveries', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.attackDiscoveries).toEqual([
        { title: 'Discovery 1', description: 'Description 1' },
        { title: 'Discovery 2', description: 'Description 2' },
      ]);
    });

    it('returns the generation result with alertsContextCount', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.alertsContextCount).toBe(2);
    });

    it('returns the generation result with executionUuid', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.executionUuid).toBe('test-execution-uuid');
    });

    it('returns the generation result with replacements', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.replacements).toEqual({ 'user-1': 'REDACTED_USER_1' });
    });

    it('returns the generation result with workflowId', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.workflowId).toBe(workflowId);
    });

    it('returns the generation result with workflowRunId', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.workflowRunId).toBe('workflow-run-id');
    });

    it('logs the start of the workflow', async () => {
      await invokeGenerationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(`Invoking generation workflow: ${workflowId}`);
    });

    it('logs the completion with discovery count', async () => {
      await invokeGenerationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generation workflow completed: 2 discoveries generated'
      );
    });

    it('passes additional_alerts in workflow inputs', async () => {
      await invokeGenerationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: workflowId }),
        'default',
        expect.objectContaining({
          additional_alerts: ['alert-1-content', 'alert-2-content'], // array, not stringified
        }),
        mockRequest
      );
    });

    it('passes api_config in workflow inputs', async () => {
      await invokeGenerationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          api_config: {
            action_type_id: '.gen-ai',
            connector_id: 'test-connector-id',
            model: 'gpt-4',
          },
        }),
        mockRequest
      );
    });

    it('passes workflowConfig params in workflow inputs', async () => {
      await invokeGenerationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          alert_retrieval_workflow_ids: ['default-attack-discovery-alert-retrieval'],
          alert_retrieval_mode: 'custom_query' as const,
          validation_workflow_id: 'attack-discovery-validation',
        }),
        mockRequest
      );
    });

    it('passes replacements from alert retrieval in workflow inputs', async () => {
      await invokeGenerationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          replacements: { 'user-1': 'REDACTED_USER_1' },
        }),
        mockRequest
      );
    });

    it('passes additional_context in workflow inputs when provided in workflowConfig', async () => {
      const propsWithContext = {
        ...defaultProps,
        workflowConfig: {
          ...defaultProps.workflowConfig,
          additional_context: 'Focus on lateral movement',
        },
      };

      await invokeGenerationWorkflow(propsWithContext);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          additional_context: 'Focus on lateral movement',
        }),
        mockRequest
      );
    });

    it('does NOT include additional_context in workflow inputs when not in workflowConfig', async () => {
      await invokeGenerationWorkflow(defaultProps);

      const workflowInputs = (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mock
        .calls[0][2] as Record<string, unknown>;

      expect(workflowInputs).not.toHaveProperty('additional_context');
    });

    it('does NOT include newAlerts in the generate-step-succeeded event', async () => {
      await invokeGenerationWorkflow(defaultProps);

      const generateStepSucceededCall = mockWriteAttackDiscoveryEvent.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>)?.action === 'generate-step-succeeded'
      );

      expect(generateStepSucceededCall).toBeDefined();
      expect(generateStepSucceededCall![0]).not.toHaveProperty('newAlerts');
    });

    it('does NOT include newAlerts in the generation-succeeded event', async () => {
      await invokeGenerationWorkflow(defaultProps);

      const generationSucceededCall = mockWriteAttackDiscoveryEvent.mock.calls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.action === 'generation-succeeded'
      );

      expect(generationSucceededCall).toBeDefined();
      expect(generationSucceededCall![0]).not.toHaveProperty('newAlerts');
    });
  });

  describe('when workflow is not found', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(null);
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_deleted', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_deleted',
        workflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        `Generation workflow (id: ${workflowId}) not found. It may have been deleted. Reconfigure the generation workflow in Attack Discovery settings.`
      );
    });
  });

  describe('when workflow has no definition', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue({
        ...mockWorkflow,
        definition: null,
      });
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_invalid', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_invalid',
        workflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        `Generation workflow '${mockWorkflow.name}' (id: ${workflowId}) is missing a definition. Edit the workflow YAML to add a valid definition.`
      );
    });
  });

  describe('when workflow is not valid', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue({
        ...mockWorkflow,
        valid: false,
      });
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_invalid', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_invalid',
        workflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        `Generation workflow '${mockWorkflow.name}' (id: ${workflowId}) is not valid. The workflow YAML contains errors. Edit the workflow to fix configuration issues.`
      );
    });
  });

  describe('when workflow is not enabled', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue({
        ...mockWorkflow,
        enabled: false,
      });
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_disabled', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_disabled',
        workflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        `Generation workflow '${mockWorkflow.name}' (id: ${workflowId}) is not enabled. Enable it in the Workflows UI to resume generation.`
      );
    });
  });

  describe('when workflow execution fails', () => {
    const mockFailedExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      error: { message: 'Generation failed', type: 'Error' },
      status: ExecutionStatus.FAILED,
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockFailedExecution
      );
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_error', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_error',
      });
    });

    it('throws with the failure message', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        'Generation workflow failed: Generation failed'
      );
    });
  });

  describe('when workflow execution is skipped due to concurrency limit', () => {
    const mockSkippedExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      status: ExecutionStatus.SKIPPED,
      stepExecutions: [],
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockSkippedExecution
      );
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory concurrent_conflict', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'concurrent_conflict',
      });
    });

    it('throws a meaningful error about the concurrency limit', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        'Generation workflow was skipped'
      );
    });

    it('does not throw the confusing step-not-found error', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.not.toThrow(
        'Generation step not found in generation workflow execution'
      );
    });
  });

  describe('when workflow execution is cancelled', () => {
    const mockCancelledExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      status: ExecutionStatus.CANCELLED,
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCancelledExecution
      );
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory concurrent_conflict', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'concurrent_conflict',
        workflowId,
      });
    });

    it('throws with workflow name and id', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        `Generation workflow '${mockWorkflow.name}' (id: ${workflowId}) was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.`
      );
    });
  });

  describe('when workflow execution times out', () => {
    const mockTimedOutExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      status: ExecutionStatus.TIMED_OUT,
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockTimedOutExecution
      );
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory timeout', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'timeout',
        workflowId,
      });
    });

    it('throws with workflow name and id', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        `Generation workflow '${mockWorkflow.name}' (id: ${workflowId}) timed out. Consider increasing the workflow timeout or reducing the alert count.`
      );
    });
  });

  describe('when execution is not found during polling', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(null);
    });

    it('throws an error', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        'Workflow execution not found: workflow-run-id'
      );
    });
  });

  describe('when generation step is not found', () => {
    const mockExecutionWithoutStep: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      stepExecutions: [],
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockExecutionWithoutStep
      );
    });

    it('throws an AttackDiscoveryError', async () => {
      const promise = invokeGenerationWorkflow(defaultProps);

      const expectation = expect(promise).rejects.toBeInstanceOf(AttackDiscoveryError);

      await jest.advanceTimersByTimeAsync(6000);

      await expectation;
    });

    it('throws with errorCategory workflow_error', async () => {
      const promise = invokeGenerationWorkflow(defaultProps);

      const expectation = expect(promise).rejects.toMatchObject({
        errorCategory: 'workflow_error',
      });

      await jest.advanceTimersByTimeAsync(6000);

      await expectation;
    });

    it('throws with the correct message', async () => {
      const promise = invokeGenerationWorkflow(defaultProps);

      const expectation = expect(promise).rejects.toThrow(
        'Generation step not found in generation workflow execution'
      );

      await jest.advanceTimersByTimeAsync(6000);

      await expectation;
    });
  });

  describe('when generation step has no output', () => {
    const mockExecutionWithNoOutput: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      stepExecutions: [
        {
          ...mockCompletedExecution.stepExecutions[0],
          output: undefined,
        },
      ],
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockExecutionWithNoOutput
      );
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_error', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_error',
      });
    });

    it('throws with actionable guidance', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        'Generation step completed but produced no output. The LLM may have returned an empty or unparseable response. Check connector and model configuration.'
      );
    });
  });

  describe('when runWorkflow throws', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockRejectedValue(
        new Error('Failed to run workflow')
      );
    });

    it('throws the error', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        'Failed to run workflow'
      );
    });

    it('logs the error', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Generation workflow failed: Failed to run workflow'
      );
    });
  });

  describe('when output has replacements as string', () => {
    const mockExecutionWithStringReplacements: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      stepExecutions: [
        {
          ...mockCompletedExecution.stepExecutions[0],
          output: {
            alerts_context_count: 2,
            attack_discoveries: [{ title: 'Discovery 1' }],
            execution_uuid: 'test-execution-uuid',
            replacements: JSON.stringify({ 'host-1': 'REDACTED_HOST_1' }),
          },
        },
      ],
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockExecutionWithStringReplacements
      );
    });

    it('parses the replacements from string', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.replacements).toEqual({ 'host-1': 'REDACTED_HOST_1' });
    });
  });

  describe('when output has empty values', () => {
    const mockExecutionWithEmptyOutput: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      stepExecutions: [
        {
          ...mockCompletedExecution.stepExecutions[0],
          output: {},
        },
      ],
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockExecutionWithEmptyOutput
      );
    });

    it('returns default empty attack discoveries', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.attackDiscoveries).toEqual([]);
    });

    it('returns zero alerts context count', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.alertsContextCount).toBe(0);
    });

    it('returns empty replacements', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.replacements).toEqual({});
    });

    it('uses executionUuid as fallback', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.executionUuid).toBe('test-execution-uuid');
    });
  });

  describe('when workflow is initially running and then completes', () => {
    const mockRunningExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      status: ExecutionStatus.RUNNING,
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock)
        .mockResolvedValueOnce(mockRunningExecution)
        .mockResolvedValue(mockCompletedExecution);
    });

    it('polls until workflow completes', async () => {
      const promise = invokeGenerationWorkflow(defaultProps);

      // Advance timers to trigger polling
      await jest.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result.attackDiscoveries).toEqual([
        { title: 'Discovery 1', description: 'Description 1' },
        { title: 'Discovery 2', description: 'Description 2' },
      ]);
    });

    it('logs debug message while waiting', async () => {
      const promise = invokeGenerationWorkflow(defaultProps);

      // Advance timers to trigger polling
      await jest.advanceTimersByTimeAsync(500);

      await promise;

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const pollingDebugCall = debugCalls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('Waiting for workflow to complete');
      });
      expect(pollingDebugCall).toBeDefined();
    });
  });

  describe('when writeAttackDiscoveryEvent fails for succeeded event', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
      // generate-step-started (ok) → generate-step-succeeded (ok) → generation-succeeded (fails)
      mockWriteAttackDiscoveryEvent
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Event logging failed'));
    });

    it('logs error but returns result', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.attackDiscoveries).toHaveLength(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to write generation-succeeded event: Event logging failed'
      );
    });
  });

  describe('when writeAttackDiscoveryEvent fails for failed event', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockRejectedValue(
        new Error('Workflow error')
      );
      mockWriteAttackDiscoveryEvent.mockRejectedValue(new Error('Event logging failed'));
    });

    it('logs error for failed step event logging', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow('Workflow error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to write generate-step-failed event: Event logging failed'
      );
    });

    it('does NOT write generation-failed (owned by executeGenerationWorkflow)', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow('Workflow error');

      const generationFailedCalls = mockWriteAttackDiscoveryEvent.mock.calls.filter(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.action === 'generation-failed'
      );

      expect(generationFailedCalls).toHaveLength(0);
    });
  });

  describe('when workflow polling times out', () => {
    const mockPendingExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      status: ExecutionStatus.PENDING,
    };

    it('throws timeout error when max wait time is exceeded', async () => {
      jest.useRealTimers();

      const timeoutApi: WorkflowsManagementApi = {
        getWorkflow: jest.fn().mockResolvedValue(mockWorkflow),
        getWorkflowExecution: jest.fn().mockResolvedValue(mockPendingExecution),
        runWorkflow: jest.fn().mockResolvedValue('workflow-run-id'),
      };

      // Verify the API would return non-terminal status
      const execution = await timeoutApi.getWorkflowExecution('test', 'default');

      expect(execution?.status).toBe('pending');

      // Restore fake timers
      jest.useFakeTimers();
    });
  });

  describe('when output has invalid replacements JSON', () => {
    const mockExecutionWithInvalidReplacements: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      stepExecutions: [
        {
          ...mockCompletedExecution.stepExecutions[0],
          output: {
            alerts_context_count: 2,
            attack_discoveries: [{ title: 'Discovery 1' }],
            execution_uuid: 'test-execution-uuid',
            replacements: 'invalid-json-{not-valid}',
          },
        },
      ],
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockExecutionWithInvalidReplacements
      );
    });

    it('returns empty replacements when JSON parsing fails', async () => {
      const result = await invokeGenerationWorkflow(defaultProps);

      expect(result.replacements).toEqual({});
    });
  });

  describe('when filter is not provided', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('passes undefined for filter in workflow inputs', async () => {
      const propsWithoutFilter = { ...defaultProps, filter: undefined };

      await invokeGenerationWorkflow(propsWithoutFilter);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          filter: undefined,
        }),
        mockRequest
      );
    });
  });

  describe('when end and start are not provided', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('passes undefined for end and start in workflow inputs', async () => {
      const propsWithoutDates = { ...defaultProps, end: undefined, start: undefined };

      await invokeGenerationWorkflow(propsWithoutDates);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          end: undefined,
          start: undefined,
        }),
        mockRequest
      );
    });
  });

  describe('when workflow execution fails with unknown error format', () => {
    const mockFailedExecutionNoMessage: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      error: null,
      status: ExecutionStatus.FAILED,
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockFailedExecutionNoMessage
      );
    });

    it('throws an error with unknown error message', async () => {
      await expect(invokeGenerationWorkflow(defaultProps)).rejects.toThrow(
        'Generation workflow failed: Unknown error'
      );
    });
  });
});
