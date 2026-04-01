/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { ExecutionStatus, type WorkflowDetailDto, type WorkflowExecutionDto } from '@kbn/workflows';

import {
  invokeAlertRetrievalWorkflow,
  type AlertRetrievalResult,
  type WorkflowsManagementApi,
} from '../invoke_alert_retrieval_workflow';
import {
  invokeGenerationWorkflow,
  type GenerationWorkflowResult,
} from '../invoke_generation_workflow';
import { invokeValidationWorkflow } from '../invoke_validation_workflow';

const mockWriteAttackDiscoveryEvent = jest.fn();
const mockGetDurationNanoseconds = jest.fn().mockReturnValue(1000000000);

jest.mock('../../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED: 'alert-retrieval-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED: 'alert-retrieval-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED: 'alert-retrieval-succeeded',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_FAILED: 'generate-step-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED: 'generate-step-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED: 'generate-step-succeeded',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED: 'generation-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED: 'generation-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED: 'generation-succeeded',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_FAILED: 'validation-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED: 'validation-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED: 'validation-succeeded',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

jest.mock('../../../lib/persistence', () => ({
  getDurationNanoseconds: (...args: unknown[]) => mockGetDurationNanoseconds(...args),
}));

/**
 * Integration tests verifying that all event log events are properly written
 * during the manual orchestration flow for Attack Discovery.
 *
 * The manual orchestration flow consists of:
 * 1. Alert retrieval workflow invocation
 * 2. Generation workflow invocation
 * 3. Validation workflow invocation
 *
 * Each step writes specific events to track progress:
 * - alert-retrieval-started, alert-retrieval-succeeded, alert-retrieval-failed
 * - generation-succeeded, generation-failed
 * - validation-started, validation-succeeded, validation-failed
 *
 * The overall generation-started event is written separately in executeGenerationWorkflow.
 */
describe('Event Logging Integration', () => {
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

  const baseWorkflowConfig = {
    alert_retrieval_workflow_ids: ['default-attack-discovery-alert-retrieval'],
    default_alert_retrieval_mode: 'custom_query' as const,
    validation_workflow_id: 'default',
  };

  const mockApiConfig = {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  };

  const mockAlertRetrievalWorkflow: WorkflowDetailDto = {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    definition: {
      enabled: true,
      name: 'Attack Discovery - Default Alert Retrieval',
      steps: [],
      triggers: [],
      version: '1',
    },
    description: 'Default alert retrieval workflow',
    enabled: true,
    id: 'workflow-default-alert-retrieval',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    name: 'Attack Discovery - Default Alert Retrieval',
    valid: true,
    yaml: 'name: Default Alert Retrieval',
  };

  const mockGenerationWorkflow: WorkflowDetailDto = {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    definition: {
      enabled: true,
      name: 'Attack discovery generation',
      steps: [],
      triggers: [],
      version: '1',
    },
    description: 'Generation workflow',
    enabled: true,
    id: 'workflow-generation',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    name: 'Attack discovery generation',
    valid: true,
    yaml: 'name: Generation',
  };

  const mockValidationWorkflow: WorkflowDetailDto = {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    definition: {
      enabled: true,
      name: 'Attack Discovery Validation',
      steps: [],
      triggers: [],
      version: '1',
    },
    description: 'Validation workflow',
    enabled: true,
    id: 'workflow-validate',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    name: 'Attack Discovery Validation',
    valid: true,
    yaml: 'name: Validation',
  };

  const createAlertRetrievalExecution = (
    status: ExecutionStatus = ExecutionStatus.COMPLETED
  ): WorkflowExecutionDto => ({
    context: {},
    duration: 1000,
    error:
      status === ExecutionStatus.FAILED
        ? { message: 'Alert retrieval failed', type: 'Error' }
        : null,
    finishedAt: '2024-01-01T00:00:01Z',
    id: 'alert-retrieval-run-id',
    isTestRun: false,
    spaceId: 'default',
    startedAt: '2024-01-01T00:00:00Z',
    status,
    stepExecutions: [
      {
        globalExecutionIndex: 0,
        id: 'step-1',
        output: {
          alerts: ['alert-1', 'alert-2', 'alert-3'],
          alerts_context_count: 3,
          anonymized_alerts: [
            { metadata: {}, page_content: 'alert-1-content' },
            { metadata: {}, page_content: 'alert-2-content' },
            { metadata: {}, page_content: 'alert-3-content' },
          ],
          api_config: mockApiConfig,
          connector_name: 'Test Connector',
          replacements: { 'user-1': 'REDACTED_USER_1' },
        },
        scopeStack: [],
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:00Z',
        stepExecutionIndex: 0,
        stepId: 'retrieve_alerts',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 0,
        workflowId: 'workflow-default-alert-retrieval',
        workflowRunId: 'alert-retrieval-run-id',
      },
    ],
    workflowDefinition: {
      enabled: true,
      name: 'Alert Retrieval',
      steps: [],
      triggers: [],
      version: '1',
    },
    workflowId: 'workflow-default-alert-retrieval',
    workflowName: 'Attack Discovery Alert Retrieval',
    yaml: 'name: Alert Retrieval',
  });

  const createGenerationExecution = (
    status: ExecutionStatus = ExecutionStatus.COMPLETED
  ): WorkflowExecutionDto => ({
    context: {},
    duration: 5000,
    error:
      status === ExecutionStatus.FAILED ? { message: 'Generation failed', type: 'Error' } : null,
    finishedAt: '2024-01-01T00:00:05Z',
    id: 'generation-run-id',
    isTestRun: false,
    spaceId: 'default',
    startedAt: '2024-01-01T00:00:00Z',
    status,
    stepExecutions: [
      {
        globalExecutionIndex: 0,
        id: 'step-1',
        output: {
          alerts_context_count: 3,
          attack_discoveries: [
            { alertIds: ['alert-1'], description: 'Discovery 1', title: 'Attack 1' },
            { alertIds: ['alert-2', 'alert-3'], description: 'Discovery 2', title: 'Attack 2' },
          ],
          execution_uuid: 'test-execution-uuid',
          replacements: { 'user-1': 'REDACTED_USER_1' },
        },
        scopeStack: [],
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:00Z',
        stepExecutionIndex: 0,
        stepId: 'generate',
        stepType: 'attack-discovery.generate',
        topologicalIndex: 0,
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
    ],
    workflowDefinition: {
      enabled: true,
      name: 'Generation',
      steps: [],
      triggers: [],
      version: '1',
    },
    workflowId: 'workflow-generation',
    workflowName: 'Attack discovery generation',
    yaml: 'name: Generation',
  });

  const createValidationExecution = (
    status: ExecutionStatus = ExecutionStatus.COMPLETED
  ): WorkflowExecutionDto => ({
    context: {},
    duration: 500,
    error:
      status === ExecutionStatus.FAILED ? { message: 'Validation failed', type: 'Error' } : null,
    finishedAt: '2024-01-01T00:00:00.500Z',
    id: 'validation-run-id',
    isTestRun: false,
    spaceId: 'default',
    startedAt: '2024-01-01T00:00:00Z',
    status,
    stepExecutions: [
      {
        globalExecutionIndex: 0,
        id: 'persist-step-1',
        output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
        scopeStack: [],
        startedAt: '2024-01-01T00:00:00Z',
        status: ExecutionStatus.COMPLETED,
        stepExecutionIndex: 0,
        stepId: 'persist_discoveries',
        stepType: 'attack-discovery.persistDiscoveries',
        topologicalIndex: 0,
        workflowId: 'workflow-validate',
        workflowRunId: 'validation-run-id',
      },
    ],
    workflowDefinition: {
      enabled: true,
      name: 'Validation',
      steps: [],
      triggers: [],
      version: '1',
    },
    workflowId: 'workflow-validate',
    workflowName: 'Attack Discovery Validation',
    yaml: 'name: Validation',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('manual orchestration flow', () => {
    describe('happy path - all events in correct sequence', () => {
      const executionUuid = 'test-execution-uuid';
      const spaceId = 'default';
      const eventLogIndex = '.kibana-event-log-test';

      let alertRetrievalResult: AlertRetrievalResult;
      let generationResult: GenerationWorkflowResult;

      beforeEach(async () => {
        // Set up mocks for successful flow
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockImplementation(
          async (workflowId: string) => {
            if (workflowId === 'workflow-default-alert-retrieval') {
              return mockAlertRetrievalWorkflow;
            }
            if (workflowId === 'workflow-generation') {
              return mockGenerationWorkflow;
            }
            if (workflowId === 'workflow-validate') {
              return mockValidationWorkflow;
            }
            return null;
          }
        );

        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockImplementation(
          async (workflow: { id: string }) => {
            if (workflow.id === 'workflow-default-alert-retrieval') {
              return 'alert-retrieval-run-id';
            }
            if (workflow.id === 'workflow-generation') {
              return 'generation-run-id';
            }
            if (workflow.id === 'workflow-validate') {
              return 'validation-run-id';
            }
            return 'unknown-run-id';
          }
        );

        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockImplementation(
          async (executionId: string) => {
            if (executionId === 'alert-retrieval-run-id') {
              return createAlertRetrievalExecution();
            }
            if (executionId === 'generation-run-id') {
              return createGenerationExecution();
            }
            if (executionId === 'validation-run-id') {
              return createValidationExecution();
            }
            return null;
          }
        );

        // Execute the full flow
        alertRetrievalResult = await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          end: '2024-01-01T00:00:00Z',
          eventLogger: mockEventLogger,
          eventLogIndex,
          executionUuid,
          filter: { bool: { must: [] } },
          logger: mockLogger,
          request: mockRequest,
          size: 100,
          spaceId,
          start: '2023-12-01T00:00:00Z',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        generationResult = await invokeGenerationWorkflow({
          alertRetrievalResult,
          alertsIndexPattern: '.alerts-security.alerts-default',
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          end: '2024-01-01T00:00:00Z',
          eventLogger: mockEventLogger,
          eventLogIndex,
          executionUuid,
          filter: { bool: { must: [] } },
          logger: mockLogger,
          request: mockRequest,
          size: 100,
          spaceId,
          start: '2023-12-01T00:00:00Z',
          workflowId: 'workflow-generation',
          workflowConfig: baseWorkflowConfig,
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        await invokeValidationWorkflow({
          alertRetrievalResult,
          authenticatedUser: mockAuthenticatedUser,
          defaultValidationWorkflowId: 'workflow-validate',
          enableFieldRendering: true,
          eventLogger: mockEventLogger,
          eventLogIndex,
          executionUuid,
          logger: mockLogger,
          generationResult,
          request: mockRequest,
          spaceId,
          withReplacements: true,
          workflowConfig: baseWorkflowConfig,
          workflowsManagementApi: mockWorkflowsManagementApi,
        });
      });

      it('writes alert-retrieval-started event first', () => {
        const calls = mockWriteAttackDiscoveryEvent.mock.calls;

        expect(calls[0][0]).toMatchObject({
          action: 'alert-retrieval-started',
        });
      });

      it('writes alert-retrieval-succeeded event second', () => {
        const calls = mockWriteAttackDiscoveryEvent.mock.calls;

        expect(calls[1][0]).toMatchObject({
          action: 'alert-retrieval-succeeded',
          alertsContextCount: 3,
          outcome: 'success',
        });
      });

      it('writes generation-succeeded event fifth', () => {
        const calls = mockWriteAttackDiscoveryEvent.mock.calls;

        expect(calls[4][0]).toMatchObject({
          action: 'generation-succeeded',
          alertsContextCount: 3,
          outcome: 'success',
        });
      });

      it('writes validation-started event sixth', () => {
        const calls = mockWriteAttackDiscoveryEvent.mock.calls;

        expect(calls[5][0]).toMatchObject({
          action: 'validation-started',
        });
      });

      it('writes validation-succeeded event seventh', () => {
        const calls = mockWriteAttackDiscoveryEvent.mock.calls;

        expect(calls[6][0]).toMatchObject({
          action: 'validation-succeeded',
          outcome: 'success',
        });
      });

      it('includes workflowExecutions in validation-succeeded event', () => {
        const calls = mockWriteAttackDiscoveryEvent.mock.calls;

        expect(calls[6][0]).toMatchObject({
          action: 'validation-succeeded',
          workflowExecutions: {
            alertRetrieval: [
              {
                workflowId: 'workflow-default-alert-retrieval',
                workflowRunId: 'alert-retrieval-run-id',
              },
            ],
            generation: {
              workflowId: 'workflow-generation',
              workflowRunId: 'generation-run-id',
            },
            validation: {
              workflowId: 'workflow-validate',
              workflowRunId: 'validation-run-id',
            },
          },
        });
      });

      it('writes exactly 7 events in the happy path', () => {
        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledTimes(7);
      });
    });

    describe('alert retrieval failure', () => {
      const executionUuid = 'test-execution-uuid';
      const spaceId = 'default';
      const eventLogIndex = '.kibana-event-log-test';

      beforeEach(() => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution(ExecutionStatus.FAILED)
        );
      });

      it('writes alert-retrieval-started event', async () => {
        await expect(
          invokeAlertRetrievalWorkflow({
            alertsIndexPattern: '.alerts-security.alerts-default',
            anonymizationFields: [],
            apiConfig: mockApiConfig,
            authenticatedUser: mockAuthenticatedUser,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            request: mockRequest,
            spaceId,
            workflowId: 'workflow-default-alert-retrieval',
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'alert-retrieval-started',
          })
        );
      });

      it('writes alert-retrieval-failed event on failure', async () => {
        await expect(
          invokeAlertRetrievalWorkflow({
            alertsIndexPattern: '.alerts-security.alerts-default',
            anonymizationFields: [],
            apiConfig: mockApiConfig,
            authenticatedUser: mockAuthenticatedUser,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            request: mockRequest,
            spaceId,
            workflowId: 'workflow-default-alert-retrieval',
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'alert-retrieval-failed',
            outcome: 'failure',
            reason: 'Alert retrieval workflow failed: Alert retrieval failed',
          })
        );
      });

      it('writes exactly 2 events on alert retrieval failure', async () => {
        await expect(
          invokeAlertRetrievalWorkflow({
            alertsIndexPattern: '.alerts-security.alerts-default',
            anonymizationFields: [],
            apiConfig: mockApiConfig,
            authenticatedUser: mockAuthenticatedUser,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            request: mockRequest,
            spaceId,
            workflowId: 'workflow-default-alert-retrieval',
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledTimes(2);
      });
    });

    describe('generation failure (generation error)', () => {
      const executionUuid = 'test-execution-uuid';
      const spaceId = 'default';
      const eventLogIndex = '.kibana-event-log-test';

      const mockAlertRetrievalResultForFailure: AlertRetrievalResult = {
        alerts: ['alert-1', 'alert-2'],
        alertsContextCount: 2,
        anonymizedAlerts: [
          { metadata: {}, page_content: 'alert-1' },
          { metadata: {}, page_content: 'alert-2' },
        ],
        apiConfig: mockApiConfig,
        connectorName: 'Test Connector',
        replacements: {},
        workflowExecutions: [
          {
            workflowId: 'workflow-default-alert-retrieval',
            workflowRunId: 'alert-retrieval-run-id',
          },
        ],
        workflowId: 'workflow-default-alert-retrieval',
        workflowRunId: 'alert-retrieval-run-id',
      };

      beforeEach(() => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockGenerationWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'generation-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createGenerationExecution(ExecutionStatus.FAILED)
        );
      });

      it('writes generate-step-failed event', async () => {
        await expect(
          invokeGenerationWorkflow({
            alertRetrievalResult: mockAlertRetrievalResultForFailure,
            alertsIndexPattern: '.alerts-security.alerts-default',
            apiConfig: mockApiConfig,
            authenticatedUser: mockAuthenticatedUser,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            request: mockRequest,
            spaceId,
            workflowId: 'workflow-generation',
            workflowConfig: baseWorkflowConfig,
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'generate-step-failed',
            outcome: 'failure',
            reason: 'Generation workflow failed: Generation failed',
          })
        );
      });

      it('does NOT write generation-failed (owned by executeGenerationWorkflow)', async () => {
        await expect(
          invokeGenerationWorkflow({
            alertRetrievalResult: mockAlertRetrievalResultForFailure,
            alertsIndexPattern: '.alerts-security.alerts-default',
            apiConfig: mockApiConfig,
            authenticatedUser: mockAuthenticatedUser,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            request: mockRequest,
            spaceId,
            workflowId: 'workflow-generation',
            workflowConfig: baseWorkflowConfig,
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        const generationFailedCalls = (
          mockWriteAttackDiscoveryEvent as jest.Mock
        ).mock.calls.filter(
          (call: unknown[]) => (call[0] as Record<string, unknown>)?.action === 'generation-failed'
        );

        expect(generationFailedCalls).toHaveLength(0);
      });

      it('includes correct fields in generate-step-failed event', async () => {
        await expect(
          invokeGenerationWorkflow({
            alertRetrievalResult: mockAlertRetrievalResultForFailure,
            alertsIndexPattern: '.alerts-security.alerts-default',
            apiConfig: mockApiConfig,
            authenticatedUser: mockAuthenticatedUser,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            request: mockRequest,
            spaceId,
            workflowId: 'workflow-generation',
            workflowConfig: baseWorkflowConfig,
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            connectorId: 'test-connector-id',
            executionUuid,
            spaceId,
          })
        );
      });
    });

    describe('validation failure', () => {
      const executionUuid = 'test-execution-uuid';
      const spaceId = 'default';
      const eventLogIndex = '.kibana-event-log-test';

      const mockAlertRetrievalResultForValidation: AlertRetrievalResult = {
        alerts: ['alert-1', 'alert-2'],
        alertsContextCount: 2,
        anonymizedAlerts: [
          { metadata: {}, page_content: 'alert-1' },
          { metadata: {}, page_content: 'alert-2' },
        ],
        apiConfig: mockApiConfig,
        connectorName: 'Test Connector',
        replacements: {},
        workflowExecutions: [
          {
            workflowId: 'workflow-default-alert-retrieval',
            workflowRunId: 'alert-retrieval-run-id',
          },
        ],
        workflowId: 'workflow-default-alert-retrieval',
        workflowRunId: 'alert-retrieval-run-id',
      };

      const mockGenerationWorkflowResultForValidation: GenerationWorkflowResult = {
        alertsContextCount: 2,
        attackDiscoveries: [{ description: 'Discovery 1', title: 'Attack 1' }],
        executionUuid,
        replacements: {},
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      };

      beforeEach(() => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockValidationWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'validation-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createValidationExecution(ExecutionStatus.FAILED)
        );
      });

      it('writes validation-started event', async () => {
        await expect(
          invokeValidationWorkflow({
            alertRetrievalResult: mockAlertRetrievalResultForValidation,
            authenticatedUser: mockAuthenticatedUser,
            defaultValidationWorkflowId: 'workflow-validate',
            enableFieldRendering: true,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            generationResult: mockGenerationWorkflowResultForValidation,
            request: mockRequest,
            spaceId,
            withReplacements: true,
            workflowConfig: baseWorkflowConfig,
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'validation-started',
          })
        );
      });

      it('writes validation-failed event on failure', async () => {
        await expect(
          invokeValidationWorkflow({
            alertRetrievalResult: mockAlertRetrievalResultForValidation,
            authenticatedUser: mockAuthenticatedUser,
            defaultValidationWorkflowId: 'workflow-validate',
            enableFieldRendering: true,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            generationResult: mockGenerationWorkflowResultForValidation,
            request: mockRequest,
            spaceId,
            withReplacements: true,
            workflowConfig: baseWorkflowConfig,
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'validation-failed',
            outcome: 'failure',
            reason: 'Validation workflow failed: Validation failed',
          })
        );
      });

      it('writes exactly 2 events on validation failure', async () => {
        await expect(
          invokeValidationWorkflow({
            alertRetrievalResult: mockAlertRetrievalResultForValidation,
            authenticatedUser: mockAuthenticatedUser,
            defaultValidationWorkflowId: 'workflow-validate',
            enableFieldRendering: true,
            eventLogger: mockEventLogger,
            eventLogIndex,
            executionUuid,
            logger: mockLogger,
            generationResult: mockGenerationWorkflowResultForValidation,
            request: mockRequest,
            spaceId,
            withReplacements: true,
            workflowConfig: baseWorkflowConfig,
            workflowsManagementApi: mockWorkflowsManagementApi,
          })
        ).rejects.toThrow();

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledTimes(2);
      });
    });

    describe('alertsContextCount flows through correctly', () => {
      it('includes alertsContextCount in alert-retrieval-succeeded event', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'alert-retrieval-succeeded',
            alertsContextCount: 3,
          })
        );
      });

      it('includes alertsContextCount in generation-succeeded event', async () => {
        const alertRetrievalResult: AlertRetrievalResult = {
          alerts: ['alert-1', 'alert-2', 'alert-3'],
          alertsContextCount: 3,
          anonymizedAlerts: [],
          apiConfig: mockApiConfig,
          connectorName: 'Test Connector',
          replacements: {},
          workflowExecutions: [
            {
              workflowId: 'workflow-default-alert-retrieval',
              workflowRunId: 'alert-retrieval-run-id',
            },
          ],
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'alert-retrieval-run-id',
        };

        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockGenerationWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'generation-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createGenerationExecution()
        );

        await invokeGenerationWorkflow({
          alertRetrievalResult,
          alertsIndexPattern: '.alerts-security.alerts-default',
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-generation',
          workflowConfig: baseWorkflowConfig,
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'generation-succeeded',
            alertsContextCount: 3,
          })
        );
      });
    });

    describe('duration is calculated correctly', () => {
      it('calls getDurationNanoseconds for alert-retrieval-succeeded event', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockGetDurationNanoseconds).toHaveBeenCalled();
      });

      it('includes duration in succeeded events', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'alert-retrieval-succeeded',
            duration: 1000000000,
          })
        );
      });
    });

    describe('workflowId and workflowRunId are present in all events', () => {
      it('includes workflowId in alert-retrieval-started event', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'alert-retrieval-started',
            workflowId: 'workflow-default-alert-retrieval',
            workflowRunId: 'alert-retrieval-run-id',
          })
        );
      });

      it('includes workflowId in alert-retrieval-succeeded event', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'alert-retrieval-succeeded',
            workflowId: 'workflow-default-alert-retrieval',
            workflowRunId: 'alert-retrieval-run-id',
          })
        );
      });

      it('includes workflowId in generation-succeeded event', async () => {
        const alertRetrievalResult: AlertRetrievalResult = {
          alerts: ['alert-1'],
          alertsContextCount: 1,
          anonymizedAlerts: [],
          apiConfig: mockApiConfig,
          connectorName: 'Test Connector',
          replacements: {},
          workflowExecutions: [
            {
              workflowId: 'workflow-default-alert-retrieval',
              workflowRunId: 'alert-retrieval-run-id',
            },
          ],
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'alert-retrieval-run-id',
        };

        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockGenerationWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'generation-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createGenerationExecution()
        );

        await invokeGenerationWorkflow({
          alertRetrievalResult,
          alertsIndexPattern: '.alerts-security.alerts-default',
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-generation',
          workflowConfig: baseWorkflowConfig,
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'generation-succeeded',
            workflowId: 'workflow-generation',
            workflowRunId: 'generation-run-id',
          })
        );
      });

      it('includes workflowId in validation-started event', async () => {
        const alertRetrievalResult: AlertRetrievalResult = {
          alerts: ['alert-1'],
          alertsContextCount: 1,
          anonymizedAlerts: [],
          apiConfig: mockApiConfig,
          connectorName: 'Test Connector',
          replacements: {},
          workflowExecutions: [
            {
              workflowId: 'workflow-default-alert-retrieval',
              workflowRunId: 'alert-retrieval-run-id',
            },
          ],
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'alert-retrieval-run-id',
        };

        const generationResult: GenerationWorkflowResult = {
          alertsContextCount: 1,
          attackDiscoveries: [{ description: 'Discovery', title: 'Attack' }],
          executionUuid: 'test-uuid',
          replacements: {},
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run-id',
        };

        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockValidationWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'validation-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createValidationExecution()
        );

        await invokeValidationWorkflow({
          alertRetrievalResult,
          authenticatedUser: mockAuthenticatedUser,
          defaultValidationWorkflowId: 'workflow-validate',
          enableFieldRendering: true,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          generationResult,
          request: mockRequest,
          spaceId: 'default',
          withReplacements: true,
          workflowConfig: baseWorkflowConfig,
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'validation-started',
            workflowId: 'workflow-validate',
            workflowRunId: 'validation-run-id',
          })
        );
      });

      it('includes workflowId in validation-succeeded event', async () => {
        const alertRetrievalResult: AlertRetrievalResult = {
          alerts: ['alert-1'],
          alertsContextCount: 1,
          anonymizedAlerts: [],
          apiConfig: mockApiConfig,
          connectorName: 'Test Connector',
          replacements: {},
          workflowExecutions: [
            {
              workflowId: 'workflow-default-alert-retrieval',
              workflowRunId: 'alert-retrieval-run-id',
            },
          ],
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'alert-retrieval-run-id',
        };

        const generationResult: GenerationWorkflowResult = {
          alertsContextCount: 1,
          attackDiscoveries: [{ description: 'Discovery', title: 'Attack' }],
          executionUuid: 'test-uuid',
          replacements: {},
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run-id',
        };

        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockValidationWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'validation-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createValidationExecution()
        );

        await invokeValidationWorkflow({
          alertRetrievalResult,
          authenticatedUser: mockAuthenticatedUser,
          defaultValidationWorkflowId: 'workflow-validate',
          enableFieldRendering: true,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          generationResult,
          request: mockRequest,
          spaceId: 'default',
          withReplacements: true,
          workflowConfig: baseWorkflowConfig,
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'validation-succeeded',
            workflowId: 'workflow-validate',
            workflowRunId: 'validation-run-id',
          })
        );
      });
    });

    describe('executionUuid is included in all events', () => {
      const executionUuid = 'unique-execution-uuid-12345';

      it('includes executionUuid in alert-retrieval events', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        const allCalls = mockWriteAttackDiscoveryEvent.mock.calls;
        allCalls.forEach((call) => {
          expect(call[0].executionUuid).toBe(executionUuid);
        });
      });

      it('includes executionUuid in validation events', async () => {
        const alertRetrievalResult: AlertRetrievalResult = {
          alerts: ['alert-1'],
          alertsContextCount: 1,
          anonymizedAlerts: [],
          apiConfig: mockApiConfig,
          connectorName: 'Test Connector',
          replacements: {},
          workflowExecutions: [
            {
              workflowId: 'workflow-default-alert-retrieval',
              workflowRunId: 'alert-retrieval-run-id',
            },
          ],
          workflowId: 'workflow-default-alert-retrieval',
          workflowRunId: 'alert-retrieval-run-id',
        };

        const generationResult: GenerationWorkflowResult = {
          alertsContextCount: 1,
          attackDiscoveries: [],
          executionUuid,
          replacements: {},
          workflowId: 'workflow-generation',
          workflowRunId: 'generation-run-id',
        };

        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockValidationWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'validation-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createValidationExecution()
        );

        await invokeValidationWorkflow({
          alertRetrievalResult,
          authenticatedUser: mockAuthenticatedUser,
          defaultValidationWorkflowId: 'workflow-validate',
          enableFieldRendering: true,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid,
          logger: mockLogger,
          generationResult,
          request: mockRequest,
          spaceId: 'default',
          withReplacements: true,
          workflowConfig: baseWorkflowConfig,
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        const allCalls = mockWriteAttackDiscoveryEvent.mock.calls;
        allCalls.forEach((call) => {
          expect(call[0].executionUuid).toBe(executionUuid);
        });
      });
    });

    describe('spaceId is included in all events', () => {
      const testSpaceId = 'custom-space';

      it('includes spaceId in alert-retrieval events', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: testSpaceId,
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        const allCalls = mockWriteAttackDiscoveryEvent.mock.calls;
        allCalls.forEach((call) => {
          expect(call[0].spaceId).toBe(testSpaceId);
        });
      });
    });

    describe('connectorId is included in all events', () => {
      it('includes connectorId from apiConfig', async () => {
        (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(
          mockAlertRetrievalWorkflow
        );
        (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue(
          'alert-retrieval-run-id'
        );
        (mockWorkflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue(
          createAlertRetrievalExecution()
        );

        const customApiConfig = {
          action_type_id: '.bedrock',
          connector_id: 'custom-connector-xyz',
          model: 'claude-v3',
        };

        await invokeAlertRetrievalWorkflow({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: customApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: '.kibana-event-log-test',
          executionUuid: 'test-uuid',
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowId: 'workflow-default-alert-retrieval',
          workflowsManagementApi: mockWorkflowsManagementApi,
        });

        const allCalls = mockWriteAttackDiscoveryEvent.mock.calls;
        allCalls.forEach((call) => {
          expect(call[0].connectorId).toBe('custom-connector-xyz');
        });
      });
    });
  });
});
