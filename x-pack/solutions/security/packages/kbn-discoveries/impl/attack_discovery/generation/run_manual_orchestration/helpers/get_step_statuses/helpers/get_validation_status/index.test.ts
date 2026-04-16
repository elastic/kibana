/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValidationStatus } from '.';

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

describe('getValidationStatus', () => {
  it('returns succeeded when outcome is validation_succeeded', () => {
    const result = getValidationStatus({
      failedStep: undefined,
      outcome: mockValidationSucceededOutcome,
    });

    expect(result).toBe('succeeded');
  });

  it('returns failed when failedStep is validation and outcome is absent', () => {
    const result = getValidationStatus({
      failedStep: 'validation',
      outcome: undefined,
    });

    expect(result).toBe('failed');
  });

  it('returns not_started when failedStep is not validation and outcome is absent', () => {
    const result = getValidationStatus({
      failedStep: 'retrieval',
      outcome: undefined,
    });

    expect(result).toBe('not_started');
  });

  it('returns not_started when both failedStep and outcome are absent', () => {
    const result = getValidationStatus({
      failedStep: undefined,
      outcome: undefined,
    });

    expect(result).toBe('not_started');
  });
});
