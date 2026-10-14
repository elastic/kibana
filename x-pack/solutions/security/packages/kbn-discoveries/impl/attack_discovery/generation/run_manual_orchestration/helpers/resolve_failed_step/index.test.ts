/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveFailedStep } from '.';

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

describe('resolveFailedStep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:10.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns retrieval when alertRetrievalResult is undefined', () => {
    const result = resolveFailedStep({
      alertRetrievalResult: undefined,
      generationResult: undefined,
      generationStartMs: 0,
      retrievalStartMs: Date.now() - 1000,
      validationStartMs: 0,
    });

    expect(result.failedStep).toBe('retrieval');
  });

  it('returns the retrieval duration when alertRetrievalResult is undefined', () => {
    const retrievalStartMs = Date.now() - 3000;

    const result = resolveFailedStep({
      alertRetrievalResult: undefined,
      generationResult: undefined,
      generationStartMs: 0,
      retrievalStartMs,
      validationStartMs: 0,
    });

    expect(result.durationMs).toBe(3000);
  });

  it('returns generation when alertRetrievalResult is defined but generationResult is undefined', () => {
    const result = resolveFailedStep({
      alertRetrievalResult: mockAlertRetrievalResult,
      generationResult: undefined,
      generationStartMs: Date.now() - 2000,
      retrievalStartMs: 0,
      validationStartMs: 0,
    });

    expect(result.failedStep).toBe('generation');
  });

  it('returns the generation duration when generationResult is undefined', () => {
    const generationStartMs = Date.now() - 5000;

    const result = resolveFailedStep({
      alertRetrievalResult: mockAlertRetrievalResult,
      generationResult: undefined,
      generationStartMs,
      retrievalStartMs: 0,
      validationStartMs: 0,
    });

    expect(result.durationMs).toBe(5000);
  });

  it('returns validation when both alertRetrievalResult and generationResult are defined', () => {
    const result = resolveFailedStep({
      alertRetrievalResult: mockAlertRetrievalResult,
      generationResult: mockGenerationResult,
      generationStartMs: 0,
      retrievalStartMs: 0,
      validationStartMs: Date.now() - 1500,
    });

    expect(result.failedStep).toBe('validation');
  });

  it('returns the validation duration when both results are defined', () => {
    const validationStartMs = Date.now() - 4000;

    const result = resolveFailedStep({
      alertRetrievalResult: mockAlertRetrievalResult,
      generationResult: mockGenerationResult,
      generationStartMs: 0,
      retrievalStartMs: 0,
      validationStartMs,
    });

    expect(result.durationMs).toBe(4000);
  });
});
