/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRetrievalResult } from '../../../../../invoke_alert_retrieval_workflow';
import { validateRetrievalResults } from '.';

const mockLegacyResult: AlertRetrievalResult = {
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
  workflowExecutions: [{ workflowId: 'legacy', workflowRunId: 'legacy-run' }],
  workflowId: 'legacy',
  workflowRunId: 'legacy-run',
};

describe('validateRetrievalResults', () => {
  it('does not throw when legacyResult is present', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [],
        legacyResult: mockLegacyResult,
      })
    ).not.toThrow();
  });

  it('does not throw when customResults are present', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [
          {
            alerts: ['custom-alert'],
            alertsContextCount: 1,
            workflowId: 'custom-wf',
            workflowRunId: 'custom-run',
          },
        ],
        legacyResult: null,
      })
    ).not.toThrow();
  });

  it('does not throw when both are present', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [
          {
            alerts: ['custom-alert'],
            alertsContextCount: 1,
            workflowId: 'custom-wf',
            workflowRunId: 'custom-run',
          },
        ],
        legacyResult: mockLegacyResult,
      })
    ).not.toThrow();
  });

  it('throws when both legacyResult is null and customResults are empty', () => {
    expect(() =>
      validateRetrievalResults({
        customResults: [],
        legacyResult: null,
      })
    ).toThrow(
      'No alert retrieval results: default retrieval is disabled or failed, and no custom workflows succeeded'
    );
  });
});
