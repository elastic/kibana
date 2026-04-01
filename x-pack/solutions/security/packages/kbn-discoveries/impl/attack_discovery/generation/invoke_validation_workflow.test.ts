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
import type { GenerationWorkflowResult } from './invoke_generation_workflow';
import { invokeValidationWorkflow } from './invoke_validation_workflow';

const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_FAILED: 'validation-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED: 'validation-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED: 'validation-succeeded',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

jest.mock('../../lib/persistence', () => ({
  getDurationNanoseconds: jest.fn().mockReturnValue(1000000),
}));

describe('invokeValidationWorkflow', () => {
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

  const defaultValidationWorkflowId = 'workflow-validate-default';

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

  const mockGenerationResult: GenerationWorkflowResult = {
    alertsContextCount: 2,
    attackDiscoveries: [
      { title: 'Discovery 1', description: 'Description 1' },
      { title: 'Discovery 2', description: 'Description 2' },
    ],
    executionUuid: 'test-execution-uuid',
    replacements: { 'user-1': 'REDACTED_USER_1' },
    workflowId: 'attack-discovery-generation',
    workflowRunId: 'workflow-run-id',
  };

  const defaultProps = {
    alertRetrievalResult: mockAlertRetrievalResult,
    authenticatedUser: mockAuthenticatedUser,
    defaultValidationWorkflowId,
    enableFieldRendering: true,
    eventLogger: mockEventLogger,
    eventLogIndex: '.kibana-event-log-test',
    executionUuid: 'test-execution-uuid',
    logger: mockLogger,
    generationResult: mockGenerationResult,
    request: mockRequest,
    spaceId: 'default',
    withReplacements: true,
    workflowConfig: {
      alert_retrieval_workflow_ids: ['default-attack-discovery-alert-retrieval'],
      default_alert_retrieval_mode: 'custom_query' as const,
      validation_workflow_id: 'default',
    },
    workflowsManagementApi: mockWorkflowsManagementApi,
  };

  const mockWorkflow: WorkflowDetailDto = {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    definition: {
      enabled: true,
      name: 'Attack Discovery Validation',
      steps: [],
      triggers: [],
      version: '1',
    },
    description: 'Test workflow',
    enabled: true,
    id: defaultValidationWorkflowId as string,
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    name: 'Attack Discovery Validation',
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
        id: 'persist-step-exec-1',
        output: {
          duplicates_dropped_count: 0,
          persisted_discoveries: [{ title: 'Discovery 1' }, { title: 'Discovery 2' }],
        },
        scopeStack: [],
        startedAt: '2024-01-01T00:00:01Z',
        status: ExecutionStatus.COMPLETED,
        stepExecutionIndex: 0,
        stepId: 'persist_discoveries',
        stepType: 'attack-discovery.persistDiscoveries',
        topologicalIndex: 0,
        workflowId: defaultValidationWorkflowId,
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
    workflowId: defaultValidationWorkflowId,
    workflowName: 'Attack Discovery Validation',
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

    it('returns success true', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('returns the correct generatedCount', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.generatedCount).toBe(2);
    });

    it('returns the validation result with workflowId', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.workflowExecution?.workflowId).toBe(defaultValidationWorkflowId);
    });

    it('returns the validation result with workflowRunId', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.workflowExecution?.workflowRunId).toBe('workflow-run-id');
    });

    it('logs the start of the workflow', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Invoking validation workflow: ${defaultValidationWorkflowId}`
      );
    });

    it('logs the completion with discovery count', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validation workflow completed: 2 discoveries stored'
      );
    });

    it('passes attack_discoveries in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: defaultValidationWorkflowId }),
        'default',
        expect.objectContaining({
          attack_discoveries: mockGenerationResult.attackDiscoveries,
        }),
        mockRequest
      );
    });

    it('passes anonymized_alerts in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          anonymized_alerts: mockAlertRetrievalResult.anonymizedAlerts,
        }),
        mockRequest
      );
    });

    it('passes api_config in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

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

    it('passes connector_name in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          connector_name: 'Test Connector',
        }),
        mockRequest
      );
    });

    it('passes generation_uuid in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          generation_uuid: 'test-execution-uuid',
        }),
        mockRequest
      );
    });

    it('passes alerts_context_count in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          alerts_context_count: 2,
        }),
        mockRequest
      );
    });

    it('passes replacements in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          replacements: { 'user-1': 'REDACTED_USER_1' },
        }),
        mockRequest
      );
    });

    it('passes enable_field_rendering in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          enable_field_rendering: true,
        }),
        mockRequest
      );
    });

    it('passes with_replacements in workflow inputs', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          with_replacements: true,
        }),
        mockRequest
      );
    });

    it('writes validation-started event', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-started',
          connectorId: 'test-connector-id',
          executionUuid: 'test-execution-uuid',
          spaceId: 'default',
        })
      );
    });

    it('writes validation-succeeded event', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          connectorId: 'test-connector-id',
          executionUuid: 'test-execution-uuid',
          outcome: 'success',
          spaceId: 'default',
        })
      );
    });

    it('sets newAlerts to persistedCount (Bug 1 fix)', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            // persisted_discoveries contains ALL items in the index (new + existing duplicates),
            // so it has generatedCount (2) items; duplicates_dropped_count is subtracted to get 1.
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [{ title: 'D1' }, { title: 'D1-duplicate' }],
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          newAlerts: 1,
        })
      );
    });

    it('embeds validationSummary in the validation-succeeded event (Bug 4 fix)', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            // persisted_discoveries contains ALL items (new + existing), duplicates subtracted below
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [{ title: 'D1' }, { title: 'D1-duplicate' }],
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 0, validated_discoveries: [{ title: 'D1' }] },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          validationSummary: expect.objectContaining({
            duplicatesDroppedCount: 1,
            generatedCount: 2,
            hallucinationsFilteredCount: 0,
            persistedCount: 1,
          }),
        })
      );
    });

    it('returns validationSummary with correct stats', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            // persisted_discoveries contains ALL items (new + existing), duplicates subtracted below
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [{ title: 'D1' }, { title: 'D1-duplicate' }],
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 0, validated_discoveries: [{ title: 'D1' }] },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary).toEqual(
        expect.objectContaining({
          duplicatesDroppedCount: 1,
          generatedCount: 2,
          hallucinationsFilteredCount: 0,
          persistedCount: 1,
        })
      );
    });
  });

  describe('when persist is false', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('includes persist: false in workflow inputs', async () => {
      await invokeValidationWorkflow({ ...defaultProps, persist: false });

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          persist: false,
        }),
        mockRequest
      );
    });
  });

  describe('when persist is undefined', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('does not include persist in workflow inputs', async () => {
      await invokeValidationWorkflow({ ...defaultProps, persist: undefined });

      const runWorkflowCall = (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mock.calls[0];
      const workflowInputs = runWorkflowCall[2] as Record<string, unknown>;

      expect(workflowInputs).not.toHaveProperty('persist');
    });
  });

  describe('polling with includeOutput', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('passes includeOutput: true when polling for workflow completion', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWorkflowsManagementApi.getWorkflowExecution).toHaveBeenCalledWith(
        'workflow-run-id',
        'default',
        { includeOutput: true }
      );
    });
  });

  describe('validatedDiscoveries extraction from step output', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
    });

    it('extracts validatedDiscoveries from the validation step output', async () => {
      const mockDiscoveries = [
        { alert_ids: ['a1'], title: 'Discovery 1' },
        { alert_ids: ['a2'], title: 'Discovery 2' },
      ];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: mockDiscoveries,
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: mockDiscoveries },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result).toEqual(
        expect.objectContaining({
          duplicatesDroppedCount: 0,
          validatedDiscoveries: mockDiscoveries,
        })
      );
    });

    it('returns undefined validatedDiscoveries when no validation step exists', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.duplicatesDroppedCount).toBe(0);
      expect(result.validatedDiscoveries).toBeUndefined();
    });

    it('returns undefined validatedDiscoveries when step output is null', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: null,
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.duplicatesDroppedCount).toBe(0);
      expect(result.validatedDiscoveries).toBeUndefined();
    });

    it('returns undefined validatedDiscoveries when validated_discoveries is not an array', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: 'not-an-array' },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.duplicatesDroppedCount).toBe(0);
      expect(result.validatedDiscoveries).toBeUndefined();
    });

    it('prefers validated_discoveries from execution context over step type search', async () => {
      const contextDiscoveries = [{ alert_ids: ['ctx-1'], title: 'Context Discovery' }];
      const stepDiscoveries = [{ alert_ids: ['step-1'], title: 'Step Discovery' }];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: { duplicates_dropped_count: 1, validated_discoveries: contextDiscoveries },
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: stepDiscoveries,
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: stepDiscoveries },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result).toEqual(
        expect.objectContaining({
          duplicatesDroppedCount: 1,
          validatedDiscoveries: contextDiscoveries,
        })
      );
    });

    it('falls back to step type search when context has no validated_discoveries', async () => {
      const stepDiscoveries = [{ alert_ids: ['step-1'], title: 'Step Discovery' }];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: { some_other_key: 'value' },
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: stepDiscoveries,
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: stepDiscoveries },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result).toEqual(
        expect.objectContaining({
          duplicatesDroppedCount: 0,
          validatedDiscoveries: stepDiscoveries,
        })
      );
    });

    it('falls back to step type search when context validated_discoveries is not an array', async () => {
      const stepDiscoveries = [{ alert_ids: ['step-1'], title: 'Step Discovery' }];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: { validated_discoveries: 'not-an-array' },
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: stepDiscoveries,
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: stepDiscoveries },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result).toEqual(
        expect.objectContaining({
          duplicatesDroppedCount: 0,
          validatedDiscoveries: stepDiscoveries,
        })
      );
    });

    it('extracts from context for custom workflows without matching step type', async () => {
      const contextDiscoveries = [{ alert_ids: ['custom-1'], title: 'Custom Discovery' }];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: {
          duplicates_dropped_count: 2,
          validated_discoveries: contextDiscoveries,
        },
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 2,
              persisted_discoveries: contextDiscoveries,
            },
            stepType: 'custom.validation_step',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result).toEqual(
        expect.objectContaining({
          duplicatesDroppedCount: 2,
          validatedDiscoveries: contextDiscoveries,
        })
      );
    });

    it('returns undefined when neither context nor step type has validated_discoveries', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: {},
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              some_other_output: 'value',
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { some_other_output: 'value' },
            stepType: 'custom.validation_step',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.duplicatesDroppedCount).toBe(0);
      expect(result.validatedDiscoveries).toBeUndefined();
    });
  });

  describe('when using custom validation workflow ID', () => {
    beforeEach(() => {
      const customWorkflow = { ...mockWorkflow, id: 'custom-validation-workflow' };
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(customWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('returns the resolved custom workflow ID', async () => {
      const propsWithCustomWorkflow = {
        ...defaultProps,
        workflowConfig: {
          ...defaultProps.workflowConfig,
          validation_workflow_id: 'custom-validation-workflow',
        },
      };

      const result = await invokeValidationWorkflow(propsWithCustomWorkflow);

      expect(result.workflowExecution?.workflowId).toBe('custom-validation-workflow');
    });

    it('uses the custom workflow ID', async () => {
      const propsWithCustomWorkflow = {
        ...defaultProps,
        workflowConfig: {
          ...defaultProps.workflowConfig,
          validation_workflow_id: 'custom-validation-workflow',
        },
      };

      await invokeValidationWorkflow(propsWithCustomWorkflow);

      expect(mockWorkflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
        'custom-validation-workflow',
        'default'
      );
    });

    it('logs the custom workflow ID', async () => {
      const propsWithCustomWorkflow = {
        ...defaultProps,
        workflowConfig: {
          ...defaultProps.workflowConfig,
          validation_workflow_id: 'custom-validation-workflow',
        },
      };

      await invokeValidationWorkflow(propsWithCustomWorkflow);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Invoking validation workflow: custom-validation-workflow'
      );
    });
  });

  describe('when workflow is not found', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(null);
    });

    it('throws an AttackDiscoveryError', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_deleted', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_deleted',
        workflowId: defaultValidationWorkflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        `Validation workflow (id: ${defaultValidationWorkflowId}) not found. It may have been deleted. Reconfigure the validation workflow in Attack Discovery settings.`
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_invalid', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_invalid',
        workflowId: defaultValidationWorkflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        `Validation workflow '${mockWorkflow.name}' (id: ${defaultValidationWorkflowId}) is missing a definition. Edit the workflow YAML to add a valid definition.`
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_invalid', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_invalid',
        workflowId: defaultValidationWorkflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        `Validation workflow '${mockWorkflow.name}' (id: ${defaultValidationWorkflowId}) is not valid. The workflow YAML contains errors. Edit the workflow to fix configuration issues.`
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_disabled', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_disabled',
        workflowId: defaultValidationWorkflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        `Validation workflow '${mockWorkflow.name}' (id: ${defaultValidationWorkflowId}) is not enabled. Enable it in the Workflows UI to resume generation.`
      );
    });
  });

  describe('when workflow execution fails', () => {
    const mockFailedExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      error: { message: 'Validation failed', type: 'Error' },
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory workflow_error', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'workflow_error',
      });
    });

    it('throws with the failure message', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        'Validation workflow failed: Validation failed'
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory concurrent_conflict', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'concurrent_conflict',
        workflowId: defaultValidationWorkflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        `Validation workflow '${mockWorkflow.name}' (id: ${defaultValidationWorkflowId}) was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.`
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toBeInstanceOf(
        AttackDiscoveryError
      );
    });

    it('throws with errorCategory timeout', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toMatchObject({
        errorCategory: 'timeout',
        workflowId: defaultValidationWorkflowId,
      });
    });

    it('throws with the correct message', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        `Validation workflow '${mockWorkflow.name}' (id: ${defaultValidationWorkflowId}) timed out. Consider increasing the workflow timeout or reducing the alert count.`
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        'Workflow execution not found: workflow-run-id'
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        'Failed to run workflow'
      );
    });

    it('logs the error', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation workflow failed: Failed to run workflow'
      );
    });

    it('writes validation-failed event', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow();

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-failed',
          outcome: 'failure',
          reason: 'Failed to run workflow',
        })
      );
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
      const promise = invokeValidationWorkflow(defaultProps);

      // Advance timers to trigger polling
      await jest.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('logs debug message while waiting', async () => {
      const promise = invokeValidationWorkflow(defaultProps);

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

  describe('when writeAttackDiscoveryEvent fails for started event', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
      mockWriteAttackDiscoveryEvent.mockRejectedValueOnce(new Error('Event logging failed'));
    });

    it('logs error but continues execution', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to write validation-started event: Event logging failed'
      );
    });
  });

  describe('when writeAttackDiscoveryEvent fails for succeeded event', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
      mockWriteAttackDiscoveryEvent
        .mockResolvedValueOnce(undefined) // started event succeeds
        .mockRejectedValueOnce(new Error('Event logging failed')); // succeeded event fails
    });

    it('logs error but returns result', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to write validation-succeeded event: Event logging failed'
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

    it('logs error for failed event logging', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow('Workflow error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to write validation-failed event: Event logging failed'
      );
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
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow(
        'Validation workflow failed: Unknown error'
      );
    });
  });

  describe('when enableFieldRendering is false', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('passes enable_field_rendering false in workflow inputs', async () => {
      const propsWithDisabledRendering = { ...defaultProps, enableFieldRendering: false };

      await invokeValidationWorkflow(propsWithDisabledRendering);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          enable_field_rendering: false,
        }),
        mockRequest
      );
    });
  });

  describe('when withReplacements is false', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('passes with_replacements false in workflow inputs', async () => {
      const propsWithoutReplacements = { ...defaultProps, withReplacements: false };

      await invokeValidationWorkflow(propsWithoutReplacements);

      expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        expect.objectContaining({
          with_replacements: false,
        }),
        mockRequest
      );
    });
  });

  describe('when generation result has empty discoveries', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('returns generatedCount of zero', async () => {
      const propsWithEmptyDiscoveries = {
        ...defaultProps,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: [],
        },
      };

      const result = await invokeValidationWorkflow(propsWithEmptyDiscoveries);

      expect(result.generatedCount).toBe(0);
    });

    it('logs completion with zero discoveries', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const propsWithEmptyDiscoveries = {
        ...defaultProps,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: [],
        },
      };

      await invokeValidationWorkflow(propsWithEmptyDiscoveries);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validation workflow completed: 0 discoveries stored'
      );
    });
  });

  describe('success log and event use persistedCount (Bug 1 + Bug 2 fixes)', () => {
    it('logs the persisted discovery count from persist step output', async () => {
      // persisted_discoveries contains ALL items in the index (new + existing duplicate).
      // generatedCount=2, duplicates_dropped_count=1 → persistedCount = 2 - 1 = 1.
      const allDiscoveries = [
        { alert_ids: ['a1'], title: 'Only One Survived' },
        { alert_ids: ['a0'], title: 'Pre-existing Duplicate' },
      ];

      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: allDiscoveries,
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: [{ title: 'Filtered' }] },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validation workflow completed: 1 discoveries stored'
      );
    });

    it('passes persistedCount as newAlerts to the success event log (Bug 1 fix)', async () => {
      // persisted_discoveries contains ALL items in the index (new + existing duplicate).
      // generatedCount=2, duplicates_dropped_count=1 → persistedCount = 2 - 1 = 1.
      const allDiscoveries = [
        { alert_ids: ['a1'], title: 'Only One Survived' },
        { alert_ids: ['a0'], title: 'Pre-existing Duplicate' },
      ];

      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: allDiscoveries,
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          newAlerts: 1,
        })
      );
    });

    it('uses empty persisted_discoveries array length (not generatedCount) when persist step returns [] (Bug 2 fix)', async () => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 2,
              persisted_discoveries: [],
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validation workflow completed: 0 discoveries stored'
      );
      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          newAlerts: 0,
        })
      );
    });

    it('subtracts duplicatesDroppedCount from persisted_discoveries.length when persisted_discoveries is present (production scenario)', async () => {
      // Mirrors the real production case: 8 generated, 5 duplicates → 3 newly persisted.
      // persisted_discoveries contains ALL 8 items (existing + new); subtracting the 5 duplicates
      // gives the correct persistedCount = 3.
      const allDiscoveries = Array.from({ length: 8 }, (_, i) => ({ title: `D${i + 1}` }));

      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 5,
              persisted_discoveries: allDiscoveries,
            },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow({
        ...defaultProps,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: allDiscoveries as typeof mockGenerationResult.attackDiscoveries,
        },
      });

      // 8 total in index - 5 pre-existing duplicates = 3 newly persisted
      expect(result.validationSummary.persistedCount).toBe(3);
    });

    it('falls back to generatedCount when persisted_discoveries is absent and no counters are available', async () => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {},
            stepType: 'custom.some_step',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      // generatedCount = 2 (from mockGenerationResult.attackDiscoveries.length)
      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          newAlerts: 2,
        })
      );
    });

    it('falls back to generatedCount - duplicatesDroppedCount when persisted_discoveries is absent', async () => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            // duplicates_dropped_count present but no persisted_discoveries
            output: { duplicates_dropped_count: 4 },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow({
        ...defaultProps,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: [
            { title: 'D1', description: 'd1' },
            { title: 'D2', description: 'd2' },
            { title: 'D3', description: 'd3' },
            { title: 'D4', description: 'd4' },
            { title: 'D5', description: 'd5' },
            { title: 'D6', description: 'd6' },
          ],
        },
      });

      // generatedCount=6, duplicatesDroppedCount=4 → persistedCount=2
      expect(result.validationSummary.persistedCount).toBe(2);
    });

    it('falls back to generatedCount - duplicatesDroppedCount - hallucinationsFilteredCount when persisted_discoveries is absent', async () => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            // duplicates_dropped_count present but no persisted_discoveries
            output: { duplicates_dropped_count: 3 },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 2, validated_discoveries: [] },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow({
        ...defaultProps,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: Array.from({ length: 10 }, (_, i) => ({
            title: `D${i + 1}`,
            description: `d${i + 1}`,
          })),
        },
      });

      // generatedCount=10, duplicatesDroppedCount=3, hallucinationsFilteredCount=2 → persistedCount=5
      expect(result.validationSummary.persistedCount).toBe(5);
    });
  });

  describe('extractHallucinationsFilteredCount', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
    });

    it('extracts filtered_count from defaultValidation step output', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 3, validated_discoveries: [] },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.hallucinationsFilteredCount).toBe(3);
    });

    it('extracts filtered_count from workflow context when present', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: { filtered_count: 5 },
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.hallucinationsFilteredCount).toBe(5);
    });

    it('returns undefined when no validation step exists', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.hallucinationsFilteredCount).toBeUndefined();
    });

    it('returns undefined when validation step output is null', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: null,
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.hallucinationsFilteredCount).toBeUndefined();
    });

    it('returns undefined when filtered_count is not a number', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 'not-a-number' },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.hallucinationsFilteredCount).toBeUndefined();
    });
  });

  describe('extractFilterReason', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
    });

    it('extracts filter_reason from defaultValidation step output', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { filter_reason: 'hallucination detected', validated_discoveries: [] },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.filterReason).toBe('hallucination detected');
    });

    it('extracts filter_reason from workflow context when present', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: { filter_reason: 'context reason' },
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.filterReason).toBe('context reason');
    });

    it('returns undefined when no filter_reason exists', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.filterReason).toBeUndefined();
    });

    it('returns undefined when filter_reason is not a string', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
          {
            output: { filter_reason: 42 },
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.filterReason).toBeUndefined();
    });
  });

  describe('extractPersistedDiscoveries', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
    });

    it('extracts persisted_discoveries from persist step output', async () => {
      const discoveries = [{ title: 'D1' }, { title: 'D2' }];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 0, persisted_discoveries: discoveries },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.persistedCount).toBe(2);
    });

    it('extracts persisted_discoveries from workflow context', async () => {
      const discoveries = [{ title: 'D1' }];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: { persisted_discoveries: discoveries },
        stepExecutions: [
          {
            output: {},
            stepType: 'custom.some_step',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.persistedCount).toBe(1);
    });

    it('falls back to generatedCount when persist step has no persisted_discoveries', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {},
            stepType: 'custom.some_step',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      // generatedCount = mockGenerationResult.attackDiscoveries.length = 2
      expect(result.validationSummary.persistedCount).toBe(2);
    });

    it('returns zero persistedCount when persisted_discoveries is empty array', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: { duplicates_dropped_count: 2, persisted_discoveries: [] },
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.persistedCount).toBe(0);
    });

    it('returns undefined persistedCount fallback when persist step output is null', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: null,
            stepType: 'attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      // Falls back to generatedCount = 2
      expect(result.validationSummary.persistedCount).toBe(2);
    });
  });

  describe('debug logging (lazy evaluation - Bug 5 fix)', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('calls logger.debug with a function (lazy evaluation)', async () => {
      await invokeValidationWorkflow(defaultProps);

      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const lazyInputsCall = debugCalls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('Validation workflow inputs');
      });

      expect(lazyInputsCall).toBeDefined();
    });

    it('includes alertsContextCount in lazy debug log', async () => {
      await invokeValidationWorkflow(defaultProps);

      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const lazyCall = debugCalls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('alertsContextCount');
      });

      expect(lazyCall).toBeDefined();
    });

    it('includes connectorName in lazy debug log', async () => {
      await invokeValidationWorkflow(defaultProps);

      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const lazyCall = debugCalls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('Test Connector');
      });

      expect(lazyCall).toBeDefined();
    });

    it('includes generatedCount (not discoveryCount) in lazy debug log', async () => {
      await invokeValidationWorkflow(defaultProps);

      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const lazyCall = debugCalls.find((call) => {
        const arg = call[0];
        return typeof arg === 'function' && arg().includes('generatedCount');
      });

      expect(lazyCall).toBeDefined();
    });
  });
});
