/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRetrievalResult } from '../invoke_alert_retrieval_workflow';
import type { CustomWorkflowAlertResult } from '../extract_custom_workflow_result';
import type { ParsedApiConfig } from '../types';
import { combineAlertRetrievalResults } from '.';

const mockApiConfig: ParsedApiConfig = {
  action_type_id: '.gen-ai',
  connector_id: 'connector-1',
  model: 'gpt-4',
};

const mockLegacyResult: AlertRetrievalResult = {
  alerts: ['legacy-alert-1', 'legacy-alert-2'],
  alertsContextCount: 2,
  anonymizedAlerts: [
    { id: '1', metadata: {}, page_content: 'anonymized-1' },
    { id: '2', metadata: {}, page_content: 'anonymized-2' },
  ],
  apiConfig: mockApiConfig,
  connectorName: 'My Connector',
  replacements: { 'uuid-1': 'real-hostname' },
  workflowExecutions: [{ workflowId: 'legacy-workflow', workflowRunId: 'legacy-run-1' }],
  workflowId: 'legacy-workflow',
  workflowRunId: 'legacy-run-1',
};

const mockCustomResult: CustomWorkflowAlertResult = {
  alerts: ['custom-alert-1', 'custom-alert-2'],
  alertsContextCount: 2,
  workflowId: 'custom-workflow-1',
  workflowRunId: 'custom-run-1',
};

describe('combineAlertRetrievalResults', () => {
  it('merges custom alerts into legacy result', () => {
    const result = combineAlertRetrievalResults({
      apiConfig: mockApiConfig,
      customResults: [mockCustomResult],
      legacyResult: mockLegacyResult,
    });

    expect(result.alerts).toEqual([
      'legacy-alert-1',
      'legacy-alert-2',
      'custom-alert-1',
      'custom-alert-2',
    ]);
    expect(result.alertsContextCount).toBe(4);
    // Legacy fields are preserved
    expect(result.anonymizedAlerts).toHaveLength(2);
    expect(result.replacements).toEqual({ 'uuid-1': 'real-hostname' });
    expect(result.connectorName).toBe('My Connector');
    // workflowExecutions combines legacy and custom workflow references
    expect(result.workflowExecutions).toEqual([
      { workflowId: 'legacy-workflow', workflowRunId: 'legacy-run-1' },
      { workflowId: 'custom-workflow-1', workflowRunId: 'custom-run-1' },
    ]);
  });

  it('combines multiple custom results with legacy', () => {
    const secondCustomResult: CustomWorkflowAlertResult = {
      alerts: ['custom-alert-3'],
      alertsContextCount: 1,
      workflowId: 'custom-workflow-2',
      workflowRunId: 'custom-run-2',
    };

    const result = combineAlertRetrievalResults({
      apiConfig: mockApiConfig,
      customResults: [mockCustomResult, secondCustomResult],
      legacyResult: mockLegacyResult,
    });

    expect(result.alerts).toEqual([
      'legacy-alert-1',
      'legacy-alert-2',
      'custom-alert-1',
      'custom-alert-2',
      'custom-alert-3',
    ]);
    expect(result.alertsContextCount).toBe(5);
    // workflowExecutions combines legacy with both custom workflow references
    expect(result.workflowExecutions).toEqual([
      { workflowId: 'legacy-workflow', workflowRunId: 'legacy-run-1' },
      { workflowId: 'custom-workflow-1', workflowRunId: 'custom-run-1' },
      { workflowId: 'custom-workflow-2', workflowRunId: 'custom-run-2' },
    ]);
  });

  it('returns legacy result unchanged when no custom results', () => {
    const result = combineAlertRetrievalResults({
      apiConfig: mockApiConfig,
      customResults: [],
      legacyResult: mockLegacyResult,
    });

    expect(result.alerts).toEqual(['legacy-alert-1', 'legacy-alert-2']);
    expect(result.alertsContextCount).toBe(2);
    expect(result.workflowId).toBe('legacy-workflow');
    expect(result.workflowExecutions).toEqual([
      { workflowId: 'legacy-workflow', workflowRunId: 'legacy-run-1' },
    ]);
  });

  it('builds synthetic result from custom workflows when no legacy result', () => {
    const result = combineAlertRetrievalResults({
      apiConfig: mockApiConfig,
      customResults: [mockCustomResult],
      legacyResult: null,
    });

    expect(result.alerts).toEqual(['custom-alert-1', 'custom-alert-2']);
    expect(result.alertsContextCount).toBe(2);
    expect(result.anonymizedAlerts).toEqual([]);
    expect(result.replacements).toEqual({});
    expect(result.apiConfig).toBe(mockApiConfig);
    expect(result.connectorName).toBe('connector-1');
    expect(result.workflowId).toBe('custom-workflow-1');
    // Custom workflow result contributes workflowId/workflowRunId to workflowExecutions
    expect(result.workflowExecutions).toEqual([
      { workflowId: 'custom-workflow-1', workflowRunId: 'custom-run-1' },
    ]);
  });

  it('handles null legacy and empty custom results gracefully', () => {
    const result = combineAlertRetrievalResults({
      apiConfig: mockApiConfig,
      customResults: [],
      legacyResult: null,
    });

    expect(result.alerts).toEqual([]);
    expect(result.alertsContextCount).toBe(0);
    expect(result.workflowId).toBe('custom');
    expect(result.workflowExecutions).toEqual([]);
  });
});
