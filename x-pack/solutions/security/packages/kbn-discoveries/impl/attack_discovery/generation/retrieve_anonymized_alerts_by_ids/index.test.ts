/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus, type WorkflowDetailDto, type WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import type { WorkflowsManagementApi } from '../invoke_alert_retrieval_workflow';
import { retrieveAnonymizedAlertsByIds } from '.';

describe('retrieveAnonymizedAlertsByIds', () => {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const request = {} as KibanaRequest;

  const apiConfig = {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  };

  const workflowId = 'system-attack-discovery-default-alert-retrieval';

  const workflow: WorkflowDetailDto = {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    definition: {
      enabled: true,
      name: 'Default alert retrieval',
      steps: [],
      triggers: [],
      version: '1',
    },
    description: 'Test workflow',
    enabled: true,
    id: workflowId,
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    name: 'Default alert retrieval',
    valid: true,
    yaml: 'name: Test',
  };

  const completedExecution: WorkflowExecutionDto = {
    context: {},
    duration: 1000,
    error: null,
    finishedAt: '2024-01-01T00:00:01Z',
    id: 'by-ids-run-id',
    isTestRun: false,
    spaceId: 'default',
    startedAt: '2024-01-01T00:00:00Z',
    status: ExecutionStatus.COMPLETED,
    stepExecutions: [
      {
        globalExecutionIndex: 0,
        id: 'step-1',
        output: {
          alerts: ['anon-alert-1', 'anon-alert-2'],
          alerts_context_count: 2,
          anonymized_alerts: [
            { metadata: {}, page_content: 'anon-alert-1' },
            { metadata: {}, page_content: 'anon-alert-2' },
          ],
          connector_name: 'Test Connector',
          replacements: { 'host.name': 'HOST_1' },
        },
        scopeStack: [],
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:00Z',
        stepExecutionIndex: 0,
        stepId: 'retrieve_alerts',
        stepType: 'security.attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 0,
        workflowId,
        workflowRunId: 'by-ids-run-id',
      },
    ],
    workflowDefinition: {
      enabled: true,
      name: 'Default alert retrieval',
      steps: [],
      triggers: [],
      version: '1',
    },
    workflowId,
    workflowName: 'Default alert retrieval',
    yaml: 'name: Test',
  };

  const buildApi = (): WorkflowsManagementApi => ({
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    getWorkflowExecution: jest.fn().mockResolvedValue(completedExecution),
    runWorkflow: jest.fn().mockResolvedValue('by-ids-run-id'),
    scheduleWorkflow: jest.fn(),
  });

  const baseParams = {
    alertIds: ['id-1', 'id-2'],
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig,
    logger,
    request,
    spaceId: 'default',
    workflowId,
  };

  it('runs the default retrieval workflow with an ids filter scoped to the curated set', async () => {
    const workflowsManagementApi = buildApi();

    await retrieveAnonymizedAlertsByIds({ ...baseParams, workflowsManagementApi });

    const inputs = (workflowsManagementApi.runWorkflow as jest.Mock).mock.calls[0][2] as Record<
      string,
      unknown
    >;

    expect(inputs.filter).toEqual({ ids: { values: ['id-1', 'id-2'] } });
  });

  it('scopes retrieval to the caller-provided spaceId, not a hardcoded or model-derived space', async () => {
    // Space-scoping is enforced in code (not prose): the caller derives spaceId
    // from the authenticated request (`getSpaceId`) and this function threads it
    // into every workflows-management call, so retrieval can never read another
    // space's alerts. A distinct, non-default space proves it is not hardcoded.
    const workflowsManagementApi = buildApi();

    await retrieveAnonymizedAlertsByIds({
      ...baseParams,
      spaceId: 'team-a',
      workflowsManagementApi,
    });

    expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith(workflowId, 'team-a');
    expect((workflowsManagementApi.runWorkflow as jest.Mock).mock.calls[0][1]).toBe('team-a');
  });

  it('requests exactly the curated alert count via size', async () => {
    const workflowsManagementApi = buildApi();

    await retrieveAnonymizedAlertsByIds({ ...baseParams, workflowsManagementApi });

    const inputs = (workflowsManagementApi.runWorkflow as jest.Mock).mock.calls[0][2] as Record<
      string,
      unknown
    >;

    expect(inputs.size).toBe(2);
  });

  it('does not constrain the retrieval by a time window (start/end omitted)', async () => {
    const workflowsManagementApi = buildApi();

    await retrieveAnonymizedAlertsByIds({ ...baseParams, workflowsManagementApi });

    const inputs = (workflowsManagementApi.runWorkflow as jest.Mock).mock.calls[0][2] as Record<
      string,
      unknown
    >;

    expect(inputs.start).toBeUndefined();
    expect(inputs.end).toBeUndefined();
  });

  it('returns the anonymized alerts and replacements from the retrieval step', async () => {
    const workflowsManagementApi = buildApi();

    const result = await retrieveAnonymizedAlertsByIds({ ...baseParams, workflowsManagementApi });

    expect(result.alerts).toEqual(['anon-alert-1', 'anon-alert-2']);
    expect(result.alertsContextCount).toBe(2);
    expect(result.anonymizedAlerts).toHaveLength(2);
    expect(result.replacements).toEqual({ 'host.name': 'HOST_1' });
  });

  it('returns a workflowExecution describing the retrieval run', async () => {
    const workflowsManagementApi = buildApi();

    const result = await retrieveAnonymizedAlertsByIds({ ...baseParams, workflowsManagementApi });

    expect(result.workflowExecution).toEqual({
      workflowId,
      workflowName: 'Default alert retrieval',
      workflowRunId: 'by-ids-run-id',
    });
  });

  it('warns when curated ids were requested but none resolved', async () => {
    const workflowsManagementApi = buildApi();
    (workflowsManagementApi.getWorkflowExecution as jest.Mock).mockResolvedValue({
      ...completedExecution,
      stepExecutions: [
        {
          ...completedExecution.stepExecutions[0],
          output: {
            alerts: [],
            alerts_context_count: 0,
            anonymized_alerts: [],
            connector_name: 'Test Connector',
            replacements: {},
          },
        },
      ],
    });

    await retrieveAnonymizedAlertsByIds({ ...baseParams, workflowsManagementApi });

    expect(
      (logger.warn as jest.Mock).mock.calls.some(([message]) =>
        String(message).includes('none resolved')
      )
    ).toBe(true);
  });

  it('throws an AttackDiscoveryError when the retrieval workflow is missing', async () => {
    const workflowsManagementApi = buildApi();
    (workflowsManagementApi.getWorkflow as jest.Mock).mockResolvedValue(null);

    await expect(
      retrieveAnonymizedAlertsByIds({ ...baseParams, workflowsManagementApi })
    ).rejects.toBeInstanceOf(AttackDiscoveryError);
  });
});
