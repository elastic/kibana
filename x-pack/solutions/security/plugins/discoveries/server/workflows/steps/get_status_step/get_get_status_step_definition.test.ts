/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';

const mockAuthenticateAndGetSpace = jest.fn();
const mockGetWorkflowExecutionsTracking = jest.fn();
const mockExtractPipelineValidationData = jest.fn();

jest.mock('../default_validation_step/helpers/authenticate_and_get_space', () => ({
  authenticateAndGetSpace: (...args: unknown[]) => mockAuthenticateAndGetSpace(...args),
}));

jest.mock('../../../routes/get/pipeline_data/helpers/get_workflow_executions_tracking', () => ({
  getWorkflowExecutionsTracking: (...args: unknown[]) => mockGetWorkflowExecutionsTracking(...args),
}));

jest.mock('../../../routes/get/pipeline_data/helpers/extract_pipeline_validation_data', () => ({
  extractPipelineValidationData: (...args: unknown[]) => mockExtractPipelineValidationData(...args),
}));

import { getGetStatusStepDefinition } from './get_get_status_step_definition';

const EXECUTION_UUID = 'run-execution-uuid';

describe('getGetStatusStepDefinition', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockGetEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log-*');
  const mockGetStartServices = jest.fn().mockResolvedValue({ coreStart: {}, pluginsStart: {} });
  const mockGetWorkflowExecution = jest.fn();
  const mockWorkflowsManagementApi = {
    getWorkflowExecution: mockGetWorkflowExecution,
  };

  const mockContext = {
    input: { execution_uuid: EXECUTION_UUID },
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue({ headers: {} }),
    },
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
    stepId: 'get-status-1',
    stepType: 'security.attack-discovery.get_status',
  };

  const getStepDefinition = () =>
    getGetStatusStepDefinition({
      getEventLogIndex: mockGetEventLogIndex,
      getStartServices: mockGetStartServices,
      logger: mockLogger,
      workflowsManagementApi: mockWorkflowsManagementApi as unknown as Parameters<
        typeof getGetStatusStepDefinition
      >[0]['workflowsManagementApi'],
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEventLogIndex.mockResolvedValue('.kibana-event-log-*');
    mockGetStartServices.mockResolvedValue({ coreStart: {}, pluginsStart: {} });
    mockAuthenticateAndGetSpace.mockResolvedValue({
      authenticatedUser: { username: 'elastic' },
      esClient: {},
      spaceId: 'default',
    });
  });

  it('has the correct step id', () => {
    expect(getStepDefinition().id).toBe('security.attack-discovery.get_status');
  });

  it('returns not_found when the execution is not tracked in the event log', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue(null);

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toEqual({
      attack_discoveries: null,
      discovery_count: 0,
      error_message: null,
      execution_uuid: EXECUTION_UUID,
      phase: null,
      status: 'not_found',
    });
  });

  it('returns succeeded with discoveries when the validation execution completed', async () => {
    const discoveries = [{ title: 'Discovery A' }, { title: 'Discovery B' }];
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      validation: { workflowRunId: 'val-run-1' },
    });
    mockGetWorkflowExecution.mockResolvedValue({ status: ExecutionStatus.COMPLETED });
    mockExtractPipelineValidationData.mockReturnValue(discoveries);

    const result = await getStepDefinition().handler(mockContext as never);

    expect(mockGetWorkflowExecution).toHaveBeenCalledWith('val-run-1', 'default', {
      includeOutput: true,
    });
    expect(result.output).toEqual({
      attack_discoveries: discoveries,
      discovery_count: 2,
      error_message: null,
      execution_uuid: EXECUTION_UUID,
      phase: 'validation',
      status: 'succeeded',
    });
  });

  it('binds the event-log read to the executing principal', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue(null);

    await getStepDefinition().handler(mockContext as never);

    expect(mockGetWorkflowExecutionsTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: EXECUTION_UUID,
        spaceId: 'default',
        username: 'elastic',
      })
    );
  });

  it('reports failed with an error message when validation failed', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      validation: { workflowRunId: 'val-run-1' },
    });
    mockGetWorkflowExecution.mockResolvedValue({
      status: ExecutionStatus.FAILED,
      error: { message: 'validation blew up' },
    });

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toEqual({
      attack_discoveries: null,
      discovery_count: 0,
      error_message: 'validation blew up',
      execution_uuid: EXECUTION_UUID,
      phase: 'validation',
      status: 'failed',
    });
  });

  it('reports running/validation while the validation execution is not terminal', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      validation: { workflowRunId: 'val-run-1' },
    });
    mockGetWorkflowExecution.mockResolvedValue({ status: ExecutionStatus.RUNNING });

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toMatchObject({ phase: 'validation', status: 'running' });
  });

  it('reports running/validation when the validation execution cannot be read yet', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      validation: { workflowRunId: 'val-run-1' },
    });
    mockGetWorkflowExecution.mockResolvedValue(null);

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toMatchObject({ phase: 'validation', status: 'running' });
    expect(mockExtractPipelineValidationData).not.toHaveBeenCalled();
  });

  it('reports failed/generation when the generation execution failed', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      generation: { workflowRunId: 'gen-run-1' },
    });
    mockGetWorkflowExecution.mockResolvedValue({
      status: ExecutionStatus.CANCELLED,
      error: 'cancelled by user',
    });

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toEqual({
      attack_discoveries: null,
      discovery_count: 0,
      error_message: 'cancelled by user',
      execution_uuid: EXECUTION_UUID,
      phase: 'generation',
      status: 'failed',
    });
  });

  it('reports running/generation while generation is in progress', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      generation: { workflowRunId: 'gen-run-1' },
    });
    mockGetWorkflowExecution.mockResolvedValue({ status: ExecutionStatus.RUNNING });

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toMatchObject({ phase: 'generation', status: 'running' });
  });

  it('reports running/alert_retrieval when only retrieval has started', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({});

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toMatchObject({ phase: 'alert_retrieval', status: 'running' });
  });

  it('returns a step error when the event-log read throws', async () => {
    mockAuthenticateAndGetSpace.mockRejectedValue(new Error('auth failed'));

    const result = await getStepDefinition().handler(mockContext as never);

    expect(result.output).toBeUndefined();
    expect(result.error?.message).toBe('auth failed');
  });
});
