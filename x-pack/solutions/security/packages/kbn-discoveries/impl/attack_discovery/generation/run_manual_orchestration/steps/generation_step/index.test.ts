/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { runGenerationStep } from '.';

const mockLogHealthCheck = jest.fn();

jest.mock('../../../../../lib/log_health_check', () => ({
  logHealthCheck: (...args: unknown[]) => mockLogHealthCheck(...args),
}));

const mockInvokeGenerationWorkflow = jest.fn();

jest.mock('../../../invoke_generation_workflow', () => ({
  invokeGenerationWorkflow: (...args: unknown[]) => mockInvokeGenerationWorkflow(...args),
}));

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockAlertRetrievalResult = {
  alerts: ['alert-1'],
  alertsContextCount: 1,
  anonymizedAlerts: [],
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  connectorName: 'Test Connector',
  replacements: {},
  workflowExecutions: [],
  workflowId: 'legacy',
  workflowRunId: 'legacy-run',
};

const mockGenerationResult = {
  alertsContextCount: 1,
  attackDiscoveries: [{ title: 'Discovery 1' }],
  executionUuid: 'test-execution-uuid',
  replacements: {},
  workflowId: 'generation',
  workflowRunId: 'generation-run',
};

const baseParams = {
  alertRetrievalResult: mockAlertRetrievalResult,
  alertsIndexPattern: '.alerts',
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  authenticatedUser: {} as never,
  eventLogger: {} as never,
  eventLogIndex: '.kibana-event-log-test',
  executionUuid: 'test-execution-uuid',
  logger: mockLogger,
  generationWorkflowId: 'generation',
  request: {} as never,
  spaceId: 'default',
  workflowConfig: {
    alert_retrieval_workflow_ids: [],
    default_alert_retrieval_mode: 'custom_query' as const,
    validation_workflow_id: 'default',
  },
  workflowsManagementApi: {} as never,
};

describe('runGenerationStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvokeGenerationWorkflow.mockResolvedValue(mockGenerationResult);
  });

  it('calls logHealthCheck with generation preconditions', async () => {
    await runGenerationStep(baseParams);

    expect(mockLogHealthCheck).toHaveBeenCalledWith(mockLogger, 'generation', {
      alertCount: 1,
      connectorId: 'test-connector-id',
      generationWorkflowId: 'generation',
    });
  });

  it('invokes the generation workflow with the correct params', async () => {
    await runGenerationStep(baseParams);

    expect(mockInvokeGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        alertRetrievalResult: mockAlertRetrievalResult,
        workflowId: 'generation',
      })
    );
  });

  it('returns the generation result on success', async () => {
    const result = await runGenerationStep(baseParams);

    expect(result).toEqual(mockGenerationResult);
  });

  it('logs the number of discoveries on success', async () => {
    await runGenerationStep(baseParams);

    expect(mockLogger.info).toHaveBeenCalledWith('Generation workflow completed: 1 discoveries');
  });

  it('throws and logs when the generation workflow fails', async () => {
    mockInvokeGenerationWorkflow.mockRejectedValue(new Error('generation boom'));

    await expect(runGenerationStep(baseParams)).rejects.toThrow('generation boom');

    expect(mockLogger.error).toHaveBeenCalledWith('Generation workflow failed: generation boom');
  });

  it('handles non-Error rejection reasons', async () => {
    mockInvokeGenerationWorkflow.mockRejectedValue('string-error');

    await expect(runGenerationStep(baseParams)).rejects.toBe('string-error');

    expect(mockLogger.error).toHaveBeenCalledWith('Generation workflow failed: string-error');
  });
});
