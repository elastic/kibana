/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { runValidationStep } from '.';

const mockLogHealthCheck = jest.fn();

jest.mock('../../../../../lib/log_health_check', () => ({
  logHealthCheck: (...args: unknown[]) => mockLogHealthCheck(...args),
}));

const mockInvokeValidationWorkflow = jest.fn();

jest.mock('../../../invoke_validation_workflow', () => ({
  invokeValidationWorkflow: (...args: unknown[]) => mockInvokeValidationWorkflow(...args),
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

const mockValidationResult = {
  discoveriesToPersist: [{ alert_ids: ['a1'], title: 'Handover 1' }],
  duplicatesDroppedCount: 0,
  generatedCount: 1,
  success: true,
  validationSummary: {
    generatedCount: 1,
    persistedCount: 1,
  },
  workflowId: 'validate',
  workflowRunId: 'validate-run',
};

const baseParams = {
  alertRetrievalResult: mockAlertRetrievalResult,
  authenticatedUser: {} as never,
  defaultValidationWorkflowId: 'validate',
  eventLogger: {} as never,
  eventLogIndex: '.kibana-event-log-test',
  executionUuid: 'test-execution-uuid',
  logger: mockLogger,
  generationResult: mockGenerationResult,
  request: {} as never,
  spaceId: 'default',
  workflowConfig: {
    alert_retrieval_mode: 'custom_query' as const,
    alert_retrieval_workflow_ids: [],
    alert_retrieval_workflows_enabled: false,
    default_retrieval_enabled: true,
    skill_enabled: true,
    validation_workflow_id: 'default',
  },
  workflowsManagementApi: {} as never,
};

describe('runValidationStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvokeValidationWorkflow.mockResolvedValue(mockValidationResult);
  });

  it('calls logHealthCheck with validation preconditions', async () => {
    await runValidationStep(baseParams);

    expect(mockLogHealthCheck).toHaveBeenCalledWith(mockLogger, 'validation', {
      defaultValidationWorkflowId: 'validate',
      discoveryCount: 1,
      validationWorkflowId: 'default',
    });
  });

  it('returns validation_succeeded with all results on success', async () => {
    const result = await runValidationStep(baseParams);

    expect(result).toEqual({
      alertRetrievalResult: mockAlertRetrievalResult,
      generationResult: mockGenerationResult,
      outcome: 'validation_succeeded',
      validationResult: mockValidationResult,
    });
  });

  it('passes discoveriesToPersist through onto the outcome', async () => {
    const result = await runValidationStep(baseParams);

    expect(result.validationResult.discoveriesToPersist).toEqual(
      mockValidationResult.discoveriesToPersist
    );
  });

  it('logs the discovery count on success', async () => {
    await runValidationStep(baseParams);

    expect(mockLogger.info).toHaveBeenCalledWith('Validation completed: 1 discoveries stored');
  });

  it('throws when validation fails', async () => {
    mockInvokeValidationWorkflow.mockRejectedValue(new Error('validation boom'));

    await expect(runValidationStep(baseParams)).rejects.toThrow('validation boom');
  });

  it('logs the error when validation throws', async () => {
    mockInvokeValidationWorkflow.mockRejectedValue(new Error('validation boom'));

    await expect(runValidationStep(baseParams)).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith('Validation workflow failed: validation boom');
  });

  it('passes enableFieldRendering and withReplacements as true', async () => {
    await runValidationStep(baseParams);

    expect(mockInvokeValidationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        enableFieldRendering: true,
        withReplacements: true,
      })
    );
  });

  it('forwards esClient and the trusted ruleId (from sourceMetadata) to invokeValidationWorkflow', async () => {
    const esClient = {} as never;

    await runValidationStep({
      ...baseParams,
      esClient,
      sourceMetadata: { actionExecutionUuid: 'a', ruleId: 'rule-123', ruleName: 'r' },
    });

    expect(mockInvokeValidationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ esClient, ruleId: 'rule-123' })
    );
  });

  it('forwards an undefined ruleId when sourceMetadata is absent', async () => {
    await runValidationStep(baseParams);

    expect(mockInvokeValidationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: undefined })
    );
  });

  it('re-throws non-Error rejection reasons', async () => {
    mockInvokeValidationWorkflow.mockRejectedValue('string-error');

    await expect(runValidationStep(baseParams)).rejects.toBe('string-error');
    expect(mockLogger.error).toHaveBeenCalledWith('Validation workflow failed: string-error');
  });
});
