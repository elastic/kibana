/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRetrievalStatus } from '.';

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

describe('getRetrievalStatus', () => {
  it('returns succeeded when alertRetrievalResult is present', () => {
    const result = getRetrievalStatus({
      alertRetrievalResult: mockAlertRetrievalResult,
      failedStep: undefined,
    });

    expect(result).toBe('succeeded');
  });

  it('returns failed when alertRetrievalResult is absent and failedStep is retrieval', () => {
    const result = getRetrievalStatus({
      alertRetrievalResult: undefined,
      failedStep: 'retrieval',
    });

    expect(result).toBe('failed');
  });

  it('returns not_started when alertRetrievalResult is absent and failedStep is not retrieval', () => {
    const result = getRetrievalStatus({
      alertRetrievalResult: undefined,
      failedStep: 'generation',
    });

    expect(result).toBe('not_started');
  });

  it('returns not_started when both alertRetrievalResult and failedStep are absent', () => {
    const result = getRetrievalStatus({
      alertRetrievalResult: undefined,
      failedStep: undefined,
    });

    expect(result).toBe('not_started');
  });
});
