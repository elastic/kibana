/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStepStatuses } from '.';

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
  attackDiscoveries: [],
  executionUuid: 'test-uuid',
  replacements: {},
  workflowId: 'generation',
  workflowRunId: 'generation-run',
};

const mockValidationSucceededOutcome = {
  alertRetrievalResult: mockAlertRetrievalResult,
  generationResult: mockGenerationResult,
  outcome: 'validation_succeeded' as const,
  validationResult: {
    duplicatesDroppedCount: 0,
    generatedCount: 1,
    success: true,
    validationSummary: { generatedCount: 1, persistedCount: 1 },
    workflowId: 'validate',
    workflowRunId: 'validate-run',
  },
};

describe('getStepStatuses', () => {
  it('returns succeeded for all three steps when pipeline completes normally', () => {
    const result = getStepStatuses({
      alertRetrievalResult: mockAlertRetrievalResult,
      failedStep: undefined,
      generationResult: mockGenerationResult,
      outcome: mockValidationSucceededOutcome,
    });

    expect(result).toEqual({
      generationStatus: 'succeeded',
      retrievalStatus: 'succeeded',
      validationStatus: 'succeeded',
    });
  });

  it('returns failed for retrieval and not_started for remaining steps when retrieval fails', () => {
    const result = getStepStatuses({
      alertRetrievalResult: undefined,
      failedStep: 'retrieval',
      generationResult: undefined,
      outcome: undefined,
    });

    expect(result).toEqual({
      generationStatus: 'not_started',
      retrievalStatus: 'failed',
      validationStatus: 'not_started',
    });
  });

  it('returns succeeded for retrieval, failed for generation, not_started for validation when generation fails', () => {
    const result = getStepStatuses({
      alertRetrievalResult: mockAlertRetrievalResult,
      failedStep: 'generation',
      generationResult: undefined,
      outcome: undefined,
    });

    expect(result).toEqual({
      generationStatus: 'failed',
      retrievalStatus: 'succeeded',
      validationStatus: 'not_started',
    });
  });

  it('returns succeeded for retrieval and generation, failed for validation when validation fails', () => {
    const result = getStepStatuses({
      alertRetrievalResult: mockAlertRetrievalResult,
      failedStep: 'validation',
      generationResult: mockGenerationResult,
      outcome: undefined,
    });

    expect(result).toEqual({
      generationStatus: 'succeeded',
      retrievalStatus: 'succeeded',
      validationStatus: 'failed',
    });
  });
});
