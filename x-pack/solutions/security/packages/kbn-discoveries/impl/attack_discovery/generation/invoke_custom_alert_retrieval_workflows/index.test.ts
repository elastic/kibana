/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger, KibanaRequest } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import type { WorkflowsManagementApi } from '../invoke_alert_retrieval_workflow';
import { invokeCustomAlertRetrievalWorkflows } from '.';

const mockLogger: Logger = loggerMock.create();

const mockRequest = {} as unknown as KibanaRequest;

const mockApiConfig = {
  action_type_id: '.gen-ai',
  connector_id: 'test-connector-id',
  model: 'gpt-4',
};

const mockAuthenticatedUser = {
  authentication_provider: { name: 'basic', type: 'basic' },
  elastic_cloud_user: false,
  username: 'test-user',
} as AuthenticatedUser;

const mockEventLogger = { logEvent: jest.fn() } as unknown as IEventLogger;

const mockEventLogIndex = '.kibana-event-log-test';

const mockExecutionUuid = 'test-execution-uuid';

jest.mock('../../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED: 'alert-retrieval-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED: 'alert-retrieval-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED: 'alert-retrieval-succeeded',
  writeAttackDiscoveryEvent: jest.fn().mockResolvedValue(undefined),
}));

const createMockWorkflowsApi = (): jest.Mocked<WorkflowsManagementApi> => ({
  getWorkflow: jest.fn(),
  getWorkflowExecution: jest.fn(),
  runWorkflow: jest.fn(),
});

describe('invokeCustomAlertRetrievalWorkflows', () => {
  it('returns empty array when no workflow IDs are provided', async () => {
    const result = await invokeCustomAlertRetrievalWorkflows({
      alertsIndexPattern: '.alerts-security.alerts-default',
      anonymizationFields: [],
      apiConfig: mockApiConfig,
      authenticatedUser: mockAuthenticatedUser,
      eventLogger: mockEventLogger,
      eventLogIndex: mockEventLogIndex,
      executionUuid: mockExecutionUuid,
      logger: mockLogger,
      request: mockRequest,
      spaceId: 'default',
      workflowIds: [],
      workflowsManagementApi: createMockWorkflowsApi(),
    });

    expect(result).toEqual([]);
  });

  it('invokes a single custom workflow and returns results', async () => {
    const api = createMockWorkflowsApi();

    api.getWorkflow.mockResolvedValue({
      definition: { steps: [] },
      enabled: true,
      id: 'workflow-1',
      name: 'Custom Workflow',
      valid: true,
      yaml: 'name: test',
    } as never);

    api.runWorkflow.mockResolvedValue('run-1');

    api.getWorkflowExecution.mockResolvedValue({
      id: 'run-1',
      status: 'completed',
      stepExecutions: [
        {
          output: {
            columns: [{ name: '_id', type: 'keyword' }],
            values: [['alert-1'], ['alert-2']],
          },
          stepType: 'elasticsearch.esql.query',
        },
      ],
    } as never);

    const result = await invokeCustomAlertRetrievalWorkflows({
      alertsIndexPattern: '.alerts-security.alerts-default',
      anonymizationFields: [],
      apiConfig: mockApiConfig,
      authenticatedUser: mockAuthenticatedUser,
      eventLogger: mockEventLogger,
      eventLogIndex: mockEventLogIndex,
      executionUuid: mockExecutionUuid,
      logger: mockLogger,
      request: mockRequest,
      spaceId: 'default',
      workflowIds: ['workflow-1'],
      workflowsManagementApi: api,
    });

    expect(result).toHaveLength(1);
    expect(result[0].alertsContextCount).toBe(2);
    expect(result[0].workflowId).toBe('workflow-1');
  });

  it('throws when any workflow fails, even if others succeed', async () => {
    const api = createMockWorkflowsApi();

    // First workflow: not found (will throw)
    api.getWorkflow
      .mockResolvedValueOnce(null)
      // Second workflow: succeeds
      .mockResolvedValueOnce({
        definition: { steps: [] },
        enabled: true,
        id: 'workflow-2',
        name: 'Working Workflow',
        valid: true,
        yaml: 'name: test',
      } as never);

    api.runWorkflow.mockResolvedValue('run-2');

    api.getWorkflowExecution.mockResolvedValue({
      id: 'run-2',
      status: 'completed',
      stepExecutions: [
        {
          output: {
            alerts: ['alert-from-workflow-2'],
          },
          stepType: 'custom.retrieval',
        },
      ],
    } as never);

    await expect(
      invokeCustomAlertRetrievalWorkflows({
        alertsIndexPattern: '.alerts-security.alerts-default',
        anonymizationFields: [],
        apiConfig: mockApiConfig,
        authenticatedUser: mockAuthenticatedUser,
        eventLogger: mockEventLogger,
        eventLogIndex: mockEventLogIndex,
        executionUuid: mockExecutionUuid,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowIds: ['workflow-1', 'workflow-2'],
        workflowsManagementApi: api,
      })
    ).rejects.toThrow(
      /workflow-1 \(Alert retrieval workflow \(id: workflow-1\) not found\. It may have been deleted\./
    );
  });

  it('includes all failed workflow IDs in the error message', async () => {
    const api = createMockWorkflowsApi();

    // Both workflows: not found (will throw)
    api.getWorkflow.mockResolvedValue(null);

    await expect(
      invokeCustomAlertRetrievalWorkflows({
        alertsIndexPattern: '.alerts-security.alerts-default',
        anonymizationFields: [],
        apiConfig: mockApiConfig,
        authenticatedUser: mockAuthenticatedUser,
        eventLogger: mockEventLogger,
        eventLogIndex: mockEventLogIndex,
        executionUuid: mockExecutionUuid,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowIds: ['workflow-a', 'workflow-b'],
        workflowsManagementApi: api,
      })
    ).rejects.toThrow(
      /workflow-a \(Alert retrieval workflow \(id: workflow-a\) not found\..*workflow-b \(Alert retrieval workflow \(id: workflow-b\) not found\./s
    );
  });

  it('passes correct inputs to the workflow', async () => {
    const api = createMockWorkflowsApi();

    api.getWorkflow.mockResolvedValue({
      definition: { steps: [] },
      enabled: true,
      id: 'workflow-1',
      name: 'Test',
      valid: true,
      yaml: 'name: test',
    } as never);

    api.runWorkflow.mockResolvedValue('run-1');

    api.getWorkflowExecution.mockResolvedValue({
      id: 'run-1',
      status: 'completed',
      stepExecutions: [],
    } as never);

    const anonymizationFields = [{ allowed: true, anonymized: true, field: 'host.name', id: '1' }];

    await invokeCustomAlertRetrievalWorkflows({
      alertsIndexPattern: '.alerts-security.alerts-myspace',
      anonymizationFields,
      apiConfig: mockApiConfig,
      authenticatedUser: mockAuthenticatedUser,
      eventLogger: mockEventLogger,
      eventLogIndex: mockEventLogIndex,
      executionUuid: mockExecutionUuid,
      logger: mockLogger,
      request: mockRequest,
      size: 50,
      spaceId: 'myspace',
      workflowIds: ['workflow-1'],
      workflowsManagementApi: api,
    });

    expect(api.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workflow-1' }),
      'myspace',
      {
        alerts_index_pattern: '.alerts-security.alerts-myspace',
        anonymization_fields: anonymizationFields,
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
          model: 'gpt-4',
        },
        filter: undefined,
        size: 50,
      },
      mockRequest
    );
  });

  it('passes anonymization_fields to custom workflows', async () => {
    const api = createMockWorkflowsApi();

    api.getWorkflow.mockResolvedValue({
      definition: { steps: [] },
      enabled: true,
      id: 'workflow-1',
      name: 'Test',
      valid: true,
      yaml: 'name: test',
    } as never);

    api.runWorkflow.mockResolvedValue('run-1');

    api.getWorkflowExecution.mockResolvedValue({
      id: 'run-1',
      status: 'completed',
      stepExecutions: [],
    } as never);

    const anonymizationFields = [
      { allowed: true, anonymized: false, field: 'user.name', id: '1' },
      { allowed: true, anonymized: true, field: 'host.name', id: '2' },
    ];

    await invokeCustomAlertRetrievalWorkflows({
      alertsIndexPattern: '.alerts-security.alerts-default',
      anonymizationFields,
      apiConfig: mockApiConfig,
      authenticatedUser: mockAuthenticatedUser,
      eventLogger: mockEventLogger,
      eventLogIndex: mockEventLogIndex,
      executionUuid: mockExecutionUuid,
      logger: mockLogger,
      request: mockRequest,
      spaceId: 'default',
      workflowIds: ['workflow-1'],
      workflowsManagementApi: api,
    });

    const [, , inputs] = api.runWorkflow.mock.calls[0];

    expect(inputs).toHaveProperty('anonymization_fields', anonymizationFields);
  });

  it('passes api_config to custom workflows', async () => {
    const api = createMockWorkflowsApi();

    api.getWorkflow.mockResolvedValue({
      definition: { steps: [] },
      enabled: true,
      id: 'workflow-1',
      name: 'Test',
      valid: true,
      yaml: 'name: test',
    } as never);

    api.runWorkflow.mockResolvedValue('run-1');

    api.getWorkflowExecution.mockResolvedValue({
      id: 'run-1',
      status: 'completed',
      stepExecutions: [],
    } as never);

    await invokeCustomAlertRetrievalWorkflows({
      alertsIndexPattern: '.alerts-security.alerts-default',
      anonymizationFields: [],
      apiConfig: mockApiConfig,
      authenticatedUser: mockAuthenticatedUser,
      eventLogger: mockEventLogger,
      eventLogIndex: mockEventLogIndex,
      executionUuid: mockExecutionUuid,
      logger: mockLogger,
      request: mockRequest,
      spaceId: 'default',
      workflowIds: ['workflow-1'],
      workflowsManagementApi: api,
    });

    const [, , inputs] = api.runWorkflow.mock.calls[0];

    expect(inputs).toHaveProperty('api_config', {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
      model: 'gpt-4',
    });
  });

  it('invokes multiple workflows in parallel rather than sequentially', async () => {
    const api = createMockWorkflowsApi();
    const callOrder: string[] = [];

    api.getWorkflow.mockImplementation(async (workflowId: string) => {
      callOrder.push(`getWorkflow:${workflowId}`);

      return {
        definition: { steps: [] },
        enabled: true,
        id: workflowId,
        name: `Workflow ${workflowId}`,
        valid: true,
        yaml: 'name: test',
      } as never;
    });

    api.runWorkflow.mockImplementation(async (workflow) => {
      callOrder.push(`runWorkflow:${(workflow as { id: string }).id}`);
      return `run-${(workflow as { id: string }).id}`;
    });

    api.getWorkflowExecution.mockImplementation(async (executionId: string) => {
      callOrder.push(`getExecution:${executionId}`);

      return {
        id: executionId,
        status: 'completed',
        stepExecutions: [],
      } as never;
    });

    const result = await invokeCustomAlertRetrievalWorkflows({
      alertsIndexPattern: '.alerts-security.alerts-default',
      anonymizationFields: [],
      apiConfig: mockApiConfig,
      authenticatedUser: mockAuthenticatedUser,
      eventLogger: mockEventLogger,
      eventLogIndex: mockEventLogIndex,
      executionUuid: mockExecutionUuid,
      logger: mockLogger,
      request: mockRequest,
      spaceId: 'default',
      workflowIds: ['wf-a', 'wf-b', 'wf-c'],
      workflowsManagementApi: api,
    });

    expect(result).toHaveLength(3);
    expect(api.getWorkflow).toHaveBeenCalledTimes(3);
    expect(api.runWorkflow).toHaveBeenCalledTimes(3);
  });

  describe('catch block errorCategory extraction', () => {
    it('passes errorCategory to the failed event when the workflow throws an AttackDiscoveryError', async () => {
      const api = createMockWorkflowsApi();
      const mockWriteAttackDiscoveryEvent = jest.requireMock('../../persistence/event_logging')
        .writeAttackDiscoveryEvent as jest.Mock;

      api.getWorkflow.mockRejectedValueOnce(
        new AttackDiscoveryError({
          errorCategory: 'workflow_disabled',
          message: 'Workflow is disabled',
          workflowId: 'wf-disabled-123',
        })
      );

      await expect(
        invokeCustomAlertRetrievalWorkflows({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: mockEventLogIndex,
          executionUuid: mockExecutionUuid,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowIds: ['wf-disabled-123'],
          workflowsManagementApi: api,
        })
      ).rejects.toThrow();

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCategory: 'workflow_disabled',
          failedWorkflowId: 'wf-disabled-123',
        })
      );
    });

    it('passes undefined errorCategory when the thrown error is a plain Error', async () => {
      const api = createMockWorkflowsApi();
      const mockWriteAttackDiscoveryEvent = jest.requireMock('../../persistence/event_logging')
        .writeAttackDiscoveryEvent as jest.Mock;

      api.getWorkflow.mockRejectedValueOnce(new Error('plain error'));

      await expect(
        invokeCustomAlertRetrievalWorkflows({
          alertsIndexPattern: '.alerts-security.alerts-default',
          anonymizationFields: [],
          apiConfig: mockApiConfig,
          authenticatedUser: mockAuthenticatedUser,
          eventLogger: mockEventLogger,
          eventLogIndex: mockEventLogIndex,
          executionUuid: mockExecutionUuid,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowIds: ['wf-plain'],
          workflowsManagementApi: api,
        })
      ).rejects.toThrow();

      expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
        expect.not.objectContaining({
          errorCategory: expect.anything(),
          failedWorkflowId: expect.anything(),
        })
      );
    });
  });

  it('does not pass start/end to custom workflows, allowing them to use their own input defaults', async () => {
    const api = createMockWorkflowsApi();

    api.getWorkflow.mockResolvedValue({
      definition: { steps: [] },
      enabled: true,
      id: 'workflow-closed-7d',
      name: 'Attack Discovery - Closed Alerts Last 7 Days',
      valid: true,
      yaml: 'name: test',
    } as never);

    api.runWorkflow.mockResolvedValue('run-closed-7d');

    api.getWorkflowExecution.mockResolvedValue({
      id: 'run-closed-7d',
      status: 'completed',
      stepExecutions: [
        {
          output: {
            columns: [{ name: '_id', type: 'keyword' }],
            values: [['alert-1']],
          },
          stepType: 'elasticsearch.esql.query',
        },
      ],
    } as never);

    await invokeCustomAlertRetrievalWorkflows({
      alertsIndexPattern: '.alerts-security.alerts-default',
      anonymizationFields: [],
      apiConfig: mockApiConfig,
      authenticatedUser: mockAuthenticatedUser,
      eventLogger: mockEventLogger,
      eventLogIndex: mockEventLogIndex,
      executionUuid: mockExecutionUuid,
      logger: mockLogger,
      request: mockRequest,
      size: 100,
      spaceId: 'default',
      workflowIds: ['workflow-closed-7d'],
      workflowsManagementApi: api,
    });

    const [, , inputs] = api.runWorkflow.mock.calls[0];

    expect(inputs).not.toHaveProperty('start');
    expect(inputs).not.toHaveProperty('end');
  });
});
