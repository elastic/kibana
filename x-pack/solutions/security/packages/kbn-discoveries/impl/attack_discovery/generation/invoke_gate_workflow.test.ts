/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';

import { invokeGateWorkflow, type InvokeGateWorkflowParams } from './invoke_gate_workflow';
import type { WorkflowsManagementApi } from './invoke_alert_retrieval_workflow';

const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED: 'alert-retrieval-failed',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED: 'alert-retrieval-started',
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED: 'alert-retrieval-succeeded',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

jest.mock('../../lib/persistence', () => ({
  getDurationNanoseconds: jest.fn().mockReturnValue(1000000),
}));

const mockPollForWorkflowCompletion = jest.fn();

jest.mock('./poll_for_workflow_completion', () => ({
  pollForWorkflowCompletion: (...args: unknown[]) => mockPollForWorkflowCompletion(...args),
}));

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockWorkflowsManagementApi: WorkflowsManagementApi = {
  getWorkflow: jest.fn(),
  getWorkflowExecution: jest.fn(),
  runWorkflow: jest.fn(),
  scheduleWorkflow: jest.fn(),
};

const workflowId = 'system-attack-discovery-skill-alert-retrieval';

const mockWorkflow: WorkflowDetailDto = {
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'test-user',
  definition: {
    enabled: true,
    name: 'Gate',
    steps: [],
    triggers: [],
    version: '1',
  },
  description: 'Gate workflow',
  enabled: true,
  id: workflowId,
  lastUpdatedAt: '2024-01-01T00:00:00Z',
  lastUpdatedBy: 'test-user',
  name: 'Gate',
  valid: true,
  yaml: 'name: Gate',
} as unknown as WorkflowDetailDto;

const completedExecution = {
  status: 'completed',
  stepExecutions: [
    {
      output: {
        conversation_id: 'conv-1',
        structured_output: {
          added_alert_ids: [],
          additional_context: 'entity risk high',
          remove_alert_ids: ['id-1'],
        },
      },
      stepType: 'ai.agent',
    },
  ],
  workflowId,
} as unknown as WorkflowExecutionDto;

const defaultProps: InvokeGateWorkflowParams = {
  alertsIndexPattern: '.alerts-security.alerts-default',
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  authenticatedUser: {} as AuthenticatedUser,
  candidateAlerts: ['_id,id-1\nhost.name,web-01', '_id,id-2\nhost.name,web-02'],
  eventLogger: { logEvent: jest.fn() } as unknown as IEventLogger,
  eventLogIndex: '.kibana-event-log-test',
  executionUuid: 'test-execution-uuid',
  logger: mockLogger,
  request: {} as KibanaRequest,
  size: 100,
  skillEnabled: true,
  spaceId: 'default',
  workflowId,
  workflowsManagementApi: mockWorkflowsManagementApi,
};

describe('invokeGateWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockWorkflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(mockWorkflow);
    (mockWorkflowsManagementApi.runWorkflow as jest.Mock).mockResolvedValue('gate-run-id');
    mockPollForWorkflowCompletion.mockResolvedValue(completedExecution);
  });

  it('returns the gate decision parsed from the ai.agent step output', async () => {
    const { decision } = await invokeGateWorkflow(defaultProps);

    expect(decision.removeAlertIds).toEqual(['id-1']);
  });

  it('surfaces the persisted conversation id', async () => {
    const { decision } = await invokeGateWorkflow(defaultProps);

    expect(decision.conversationId).toBe('conv-1');
  });

  it('passes the candidate alerts and skill_enabled to the gate workflow', async () => {
    await invokeGateWorkflow(defaultProps);

    expect(mockWorkflowsManagementApi.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      'default',
      expect.objectContaining({
        candidate_alerts: defaultProps.candidateAlerts,
        connector_id: 'test-connector-id',
        skill_enabled: true,
      }),
      expect.anything()
    );
  });

  it('returns the gate workflow execution tracking entry', async () => {
    const { workflowExecution } = await invokeGateWorkflow(defaultProps);

    expect(workflowExecution).toEqual({
      workflowId,
      workflowName: 'Gate',
      workflowRunId: 'gate-run-id',
    });
  });

  it('writes a started and a succeeded event', async () => {
    await invokeGateWorkflow(defaultProps);

    const actions = mockWriteAttackDiscoveryEvent.mock.calls.map((call) => call[0].action);
    expect(actions).toEqual(['alert-retrieval-started', 'alert-retrieval-succeeded']);
  });

  it('records the gate run under the `gate` bucket (Generation phase), NOT alertRetrieval', async () => {
    await invokeGateWorkflow(defaultProps);

    for (const call of mockWriteAttackDiscoveryEvent.mock.calls) {
      const { workflowExecutions } = call[0];
      expect(workflowExecutions.gate).toEqual([
        { workflowId, workflowName: 'Gate', workflowRunId: 'gate-run-id' },
      ]);
      expect(workflowExecutions.alertRetrieval).toBeNull();
    }
  });

  it('counts (candidates − removed) + added ids in the succeeded event alertsContextCount', async () => {
    // 2 candidates, 1 removed (id-1) => 1 kept, plus 3 added => 4.
    mockPollForWorkflowCompletion.mockResolvedValue({
      status: 'completed',
      stepExecutions: [
        {
          output: {
            conversation_id: 'conv-1',
            structured_output: {
              added_alert_ids: ['added-1', 'added-2', 'added-3'],
              remove_alert_ids: ['id-1'],
            },
          },
          stepType: 'ai.agent',
        },
      ],
      workflowId,
    } as unknown as WorkflowExecutionDto);

    await invokeGateWorkflow(defaultProps);

    const succeeded = mockWriteAttackDiscoveryEvent.mock.calls.find(
      (call) => call[0].action === 'alert-retrieval-succeeded'
    );
    expect(succeeded?.[0].alertsContextCount).toBe(4);
  });

  it('does not let a hallucinated remove id shrink the kept count below the candidate count', async () => {
    // A remove id that matches no candidate removes nothing: 2 candidates kept.
    mockPollForWorkflowCompletion.mockResolvedValue({
      status: 'completed',
      stepExecutions: [
        {
          output: {
            conversation_id: 'conv-1',
            structured_output: {
              added_alert_ids: [],
              remove_alert_ids: ['does-not-exist'],
            },
          },
          stepType: 'ai.agent',
        },
      ],
      workflowId,
    } as unknown as WorkflowExecutionDto);

    await invokeGateWorkflow(defaultProps);

    const succeeded = mockWriteAttackDiscoveryEvent.mock.calls.find(
      (call) => call[0].action === 'alert-retrieval-succeeded'
    );
    expect(succeeded?.[0].alertsContextCount).toBe(2);
  });

  it('records the gate run under the `gate` bucket on failure', async () => {
    mockPollForWorkflowCompletion.mockResolvedValue({
      error: { message: 'boom' },
      status: 'failed',
      stepExecutions: [],
      workflowId,
    } as unknown as WorkflowExecutionDto);

    await expect(invokeGateWorkflow(defaultProps)).rejects.toThrow();

    const failed = mockWriteAttackDiscoveryEvent.mock.calls.find(
      (call) => call[0].action === 'alert-retrieval-failed'
    );
    expect(failed?.[0].workflowExecutions.gate).toEqual([
      expect.objectContaining({ workflowId, workflowRunId: expect.any(String) }),
    ]);
    expect(failed?.[0].workflowExecutions.alertRetrieval).toBeNull();
  });

  it('fails closed when the gate execution failed', async () => {
    mockPollForWorkflowCompletion.mockResolvedValue({
      error: { message: 'boom' },
      status: 'failed',
      stepExecutions: [],
      workflowId,
    } as unknown as WorkflowExecutionDto);

    await expect(invokeGateWorkflow(defaultProps)).rejects.toThrow('Gate workflow failed');
  });

  it('writes a failed event when the gate fails closed', async () => {
    mockPollForWorkflowCompletion.mockResolvedValue({
      error: { message: 'boom' },
      status: 'failed',
      stepExecutions: [],
      workflowId,
    } as unknown as WorkflowExecutionDto);

    await expect(invokeGateWorkflow(defaultProps)).rejects.toThrow();

    const actions = mockWriteAttackDiscoveryEvent.mock.calls.map((call) => call[0].action);
    expect(actions).toContain('alert-retrieval-failed');
  });
});
