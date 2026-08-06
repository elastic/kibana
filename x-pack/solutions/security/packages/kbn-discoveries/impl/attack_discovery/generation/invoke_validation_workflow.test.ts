/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { ExecutionStatus, type WorkflowDetailDto, type WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../lib/errors/attack_discovery_error';

import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from './invoke_alert_retrieval_workflow';
import type { GenerationWorkflowResult } from './invoke_generation_workflow';
import { invokeValidationWorkflow } from './invoke_validation_workflow';

const mockDeduplicateScheduledDiscoveries = jest.fn();

jest.mock('./deduplicate_scheduled_discoveries', () => ({
  deduplicateScheduledDiscoveries: (...args: unknown[]) =>
    mockDeduplicateScheduledDiscoveries(...args),
}));

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
    scheduleWorkflow: jest.fn(),
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
      alert_retrieval_mode: 'custom_query' as const,
      alert_retrieval_workflow_ids: ['default-attack-discovery-alert-retrieval'],
      alert_retrieval_workflows_enabled: false,
      default_retrieval_enabled: true,
      skill_enabled: true,
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
        stepType: 'security.attack-discovery.persistDiscoveries',
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
            // persisted_discoveries contains ONLY the net-new discovery (duplicates are
            // dropped on write), so persistedCount is its length directly.
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [{ title: 'D1' }],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            // persisted_discoveries contains ONLY the net-new discovery (duplicates dropped on write)
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [{ title: 'D1' }],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 0, validated_discoveries: [{ title: 'D1' }] },
            stepType: 'security.attack-discovery.defaultValidation',
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
            // persisted_discoveries contains ONLY the net-new discovery (duplicates dropped on write)
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [{ title: 'D1' }],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 0, validated_discoveries: [{ title: 'D1' }] },
            stepType: 'security.attack-discovery.defaultValidation',
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

    it('returns workflowName in workflowExecution', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.workflowExecution?.workflowName).toBe('Attack Discovery Validation');
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: mockDiscoveries },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: null,
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: 'not-an-array' },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: stepDiscoveries },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: stepDiscoveries },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: stepDiscoveries },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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

  describe('when validation_workflow_id is empty string', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockCompletedExecution
      );
    });

    it('falls back to the default validation workflow ID', async () => {
      const propsWithEmptyId = {
        ...defaultProps,
        workflowConfig: {
          ...defaultProps.workflowConfig,
          validation_workflow_id: '',
        },
      };

      await invokeValidationWorkflow(propsWithEmptyId);

      expect(mockWorkflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
        defaultValidationWorkflowId,
        'default'
      );
    });

    it('returns the default workflow ID in the result', async () => {
      const propsWithEmptyId = {
        ...defaultProps,
        workflowConfig: {
          ...defaultProps.workflowConfig,
          validation_workflow_id: '',
        },
      };

      const result = await invokeValidationWorkflow(propsWithEmptyId);

      expect(result.workflowExecution?.workflowId).toBe(defaultValidationWorkflowId);
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

    it('does NOT include workflowName in the validation-failed event workflowExecutions', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow();

      const failedCall = mockWriteAttackDiscoveryEvent.mock.calls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.action === 'validation-failed'
      );

      expect(failedCall![0].workflowExecutions.validation).not.toHaveProperty('workflowName');
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

    it('includes workflowName in the validation-failed event workflowExecutions', async () => {
      await expect(invokeValidationWorkflow(defaultProps)).rejects.toThrow();

      const failedCall = mockWriteAttackDiscoveryEvent.mock.calls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.action === 'validation-failed'
      );

      expect(failedCall![0].workflowExecutions.validation).toEqual(
        expect.objectContaining({
          workflowName: 'Attack Discovery Validation',
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

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      // The execution never reaches a terminal status, so the poll must give up
      // once the max wait time is exceeded.
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockPendingExecution
      );
    });

    it('throws a timeout error when the max wait time is exceeded', async () => {
      await expect(invokeValidationWorkflow({ ...defaultProps, maxWaitMs: 0 })).rejects.toThrow(
        'Workflow timed out after 0ms (execution: workflow-run-id)'
      );
    });

    it('writes a validation-failed event when the poll times out', async () => {
      await expect(invokeValidationWorkflow({ ...defaultProps, maxWaitMs: 0 })).rejects.toThrow();

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-failed',
          outcome: 'failure',
        })
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
      // persisted_discoveries contains ONLY the net-new discovery; the pre-existing
      // duplicate was dropped on write and counted in duplicates_dropped_count.
      const newDiscoveries = [{ alert_ids: ['a1'], title: 'Only One Survived' }];

      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: newDiscoveries,
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { validated_discoveries: [{ title: 'Filtered' }] },
            stepType: 'security.attack-discovery.defaultValidation',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validation workflow completed: 1 discoveries stored'
      );
    });

    it('passes persistedCount as newAlerts to the success event log (Bug 1 fix)', async () => {
      // persisted_discoveries contains ONLY the net-new discovery; the pre-existing
      // duplicate was dropped on write and counted in duplicates_dropped_count.
      const newDiscoveries = [{ alert_ids: ['a1'], title: 'Only One Survived' }];

      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: newDiscoveries,
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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

    it('reports persisted_discoveries.length as persistedCount (already the net-new set)', async () => {
      // Mirrors the real production case: 8 generated, 5 duplicates dropped on write → 3
      // newly persisted. persisted_discoveries contains ONLY those 3 net-new discoveries.
      const generatedDiscoveries = Array.from({ length: 8 }, (_, i) => ({ title: `D${i + 1}` }));
      const newDiscoveries = generatedDiscoveries.slice(0, 3);

      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 5,
              persisted_discoveries: newDiscoveries,
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow({
        ...defaultProps,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: generatedDiscoveries as typeof mockGenerationResult.attackDiscoveries,
        },
      });

      // persisted_discoveries already contains only the 3 net-new discoveries
      expect(result.validationSummary.persistedCount).toBe(3);
    });

    it('falls back to generatedCount when the persist step ran but persisted_discoveries is absent and no counters are available', async () => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {},
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 2, validated_discoveries: [] },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 3, validated_discoveries: [] },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: null,
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { filtered_count: 'not-a-number' },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { filter_reason: 'hallucination detected', validated_discoveries: [] },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
          {
            output: { filter_reason: 42 },
            stepType: 'security.attack-discovery.defaultValidation',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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

    it('falls back to generatedCount when persist step ran but has no persisted_discoveries', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {},
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
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
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      // Falls back to generatedCount = 2
      expect(result.validationSummary.persistedCount).toBe(2);
    });
  });

  describe('extractDiscoveriesToPersist (persist step handover)', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
    });

    it('extracts discoveriesToPersist from the persist step discoveries_to_persist output', async () => {
      const handover = [{ alert_ids: ['a1'], title: 'Handover 1' }];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              discoveries_to_persist: handover,
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.discoveriesToPersist).toEqual(handover);
    });

    it('defaults discoveriesToPersist to an empty array when the persist step omits the field', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.discoveriesToPersist).toEqual([]);
    });

    it('defaults discoveriesToPersist to an empty array when no persist step ran (R1)', async () => {
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

      expect(result.discoveriesToPersist).toEqual([]);
    });

    it('logs a warning when no persist step ran (R1)', async () => {
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

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('did not invoke the persist step')
      );
    });

    it('does not log a warning when the persist step ran', async () => {
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            output: {
              discoveries_to_persist: [{ alert_ids: ['a1'], title: 'Handover 1' }],
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      });

      await invokeValidationWorkflow(defaultProps);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('reports persistedCount from the handover for scheduled (no ad-hoc persistence)', async () => {
      const handover = [
        { alert_ids: ['a1'], title: 'Handover 1' },
        { alert_ids: ['a2'], title: 'Handover 2' },
      ];

      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        stepExecutions: [
          {
            // Scheduled: ad-hoc persistence is skipped (persisted_discoveries is empty),
            // but the handover rides discoveries_to_persist.
            output: {
              discoveries_to_persist: handover,
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      });

      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.persistedCount).toBe(2);
    });
  });

  describe('R1 no-persist (noop) reports persistedCount of 0 (kibana-az5 fix)', () => {
    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      // A validation workflow that completed but never invoked the persist step and
      // produced no persisted output or handover: nothing was persisted (noop).
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
        ...mockCompletedExecution,
        context: {},
        stepExecutions: [
          {
            output: {},
            stepType: 'custom.some_step',
          },
        ],
      });
    });

    it('reports persistedCount of 0 (not the generated count) in validationSummary', async () => {
      const result = await invokeValidationWorkflow(defaultProps);

      expect(result.validationSummary.persistedCount).toBe(0);
    });

    it('passes newAlerts of 0 to the success event log', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          newAlerts: 0,
        })
      );
    });

    it('logs completion with 0 discoveries stored', async () => {
      await invokeValidationWorkflow(defaultProps);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validation workflow completed: 0 discoveries stored'
      );
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

  describe('FF-on scheduled cross-execution de-duplication', () => {
    const mockEsClient = {} as unknown as ElasticsearchClient;
    const mockComputeSha256Hash = (input: string): string => `sha256(${input})`;

    const handover = [
      { alert_ids: ['a1'], title: 'H1' },
      { alert_ids: ['a2'], title: 'H2' },
      { alert_ids: ['a3'], title: 'H3' },
    ];

    // Scheduled: ad-hoc persistence is skipped (persisted_discoveries empty), the
    // persist step reports the handover with duplicates_dropped_count 0.
    const mockScheduledExecution: WorkflowExecutionDto = {
      ...mockCompletedExecution,
      stepExecutions: [
        {
          ...mockCompletedExecution.stepExecutions[0],
          output: {
            discoveries_to_persist: handover,
            duplicates_dropped_count: 0,
            persisted_discoveries: [],
          },
        },
      ],
    };

    const scheduledProps = {
      ...defaultProps,
      computeSha256Hash: mockComputeSha256Hash,
      esClient: mockEsClient,
      ruleId: 'rule-123',
      source: 'scheduled' as const,
    };

    beforeEach(() => {
      (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
      (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('workflow-run-id');
      (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
        mockScheduledExecution
      );
      // Default: drop the two known duplicates, keep one survivor.
      mockDeduplicateScheduledDiscoveries.mockResolvedValue([handover[0]]);
    });

    it('calls deduplicateScheduledDiscoveries with the trusted owner and handover', async () => {
      await invokeValidationWorkflow(scheduledProps);

      expect(mockDeduplicateScheduledDiscoveries).toHaveBeenCalledWith({
        computeSha256Hash: mockComputeSha256Hash,
        connectorId: 'test-connector-id',
        discoveriesToPersist: handover,
        esClient: mockEsClient,
        logger: mockLogger,
        replacements: { 'user-1': 'REDACTED_USER_1' },
        ruleId: 'rule-123',
        spaceId: 'default',
      });
    });

    it('returns the reduced discoveriesToPersist', async () => {
      const result = await invokeValidationWorkflow(scheduledProps);

      expect(result.discoveriesToPersist).toEqual([handover[0]]);
    });

    it('recomputes persistedCount as the number of survivors', async () => {
      const result = await invokeValidationWorkflow(scheduledProps);

      expect(result.validationSummary.persistedCount).toBe(1);
    });

    it('recomputes duplicatesDroppedCount as the number dropped this run', async () => {
      const result = await invokeValidationWorkflow(scheduledProps);

      expect(result.validationSummary.duplicatesDroppedCount).toBe(2);
    });

    it('writes the accurate persistedCount as newAlerts in the succeeded event', async () => {
      await invokeValidationWorkflow(scheduledProps);

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'validation-succeeded',
          newAlerts: 1,
          validationSummary: expect.objectContaining({
            duplicatesDroppedCount: 2,
            persistedCount: 1,
          }),
        })
      );
    });

    it('does not de-duplicate for non-scheduled sources', async () => {
      await invokeValidationWorkflow({ ...scheduledProps, source: 'interactive' });

      expect(mockDeduplicateScheduledDiscoveries).not.toHaveBeenCalled();
    });

    it('does not de-duplicate when esClient is absent', async () => {
      await invokeValidationWorkflow({ ...scheduledProps, esClient: undefined });

      expect(mockDeduplicateScheduledDiscoveries).not.toHaveBeenCalled();
    });

    it('does not de-duplicate when ruleId is absent', async () => {
      await invokeValidationWorkflow({ ...scheduledProps, ruleId: undefined });

      expect(mockDeduplicateScheduledDiscoveries).not.toHaveBeenCalled();
    });

    it('does not de-duplicate when computeSha256Hash is absent', async () => {
      await invokeValidationWorkflow({ ...scheduledProps, computeSha256Hash: undefined });

      expect(mockDeduplicateScheduledDiscoveries).not.toHaveBeenCalled();
    });

    it('reports the un-reduced handover when the source is not scheduled', async () => {
      const result = await invokeValidationWorkflow({ ...scheduledProps, source: 'interactive' });

      expect(result.discoveriesToPersist).toEqual(handover);
      expect(result.validationSummary.persistedCount).toBe(3);
    });

    it('does not corrupt counts when the best-effort helper falls back to no dedup', async () => {
      // On an ES failure the helper returns the original handover unchanged.
      mockDeduplicateScheduledDiscoveries.mockResolvedValue(handover);

      const result = await invokeValidationWorkflow(scheduledProps);

      expect(result.discoveriesToPersist).toEqual(handover);
      expect(result.validationSummary.duplicatesDroppedCount).toBe(0);
      expect(result.validationSummary.persistedCount).toBe(3);
    });
  });
});
