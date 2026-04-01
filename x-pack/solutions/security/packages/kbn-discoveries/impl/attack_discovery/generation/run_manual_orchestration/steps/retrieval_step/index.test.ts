/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { runRetrievalStep } from '.';

const mockLogHealthCheck = jest.fn();

jest.mock('../../../../../lib/log_health_check', () => ({
  logHealthCheck: (...args: unknown[]) => mockLogHealthCheck(...args),
}));

const mockCreateLegacyRetrievalPromise = jest.fn();
const mockInvokeCustomAlertRetrievalWorkflows = jest.fn();
const mockResolveLegacySettledResult = jest.fn();
const mockResolveCustomSettledResults = jest.fn();
const mockValidateRetrievalResults = jest.fn();
const mockCombineAlertRetrievalResults = jest.fn();

jest.mock('./helpers/create_default_retrieval_promise', () => ({
  createLegacyRetrievalPromise: (...args: unknown[]) => mockCreateLegacyRetrievalPromise(...args),
}));

jest.mock('../../../invoke_custom_alert_retrieval_workflows', () => ({
  invokeCustomAlertRetrievalWorkflows: (...args: unknown[]) =>
    mockInvokeCustomAlertRetrievalWorkflows(...args),
}));

jest.mock('./helpers/resolve_default_settled_result', () => ({
  resolveLegacySettledResult: (...args: unknown[]) => mockResolveLegacySettledResult(...args),
}));

jest.mock('./helpers/resolve_custom_settled_results', () => ({
  resolveCustomSettledResults: (...args: unknown[]) => mockResolveCustomSettledResults(...args),
}));

jest.mock('./helpers/validate_retrieval_results', () => ({
  validateRetrievalResults: (...args: unknown[]) => mockValidateRetrievalResults(...args),
}));

jest.mock('../../../combine_alert_retrieval_results', () => ({
  combineAlertRetrievalResults: (...args: unknown[]) => mockCombineAlertRetrievalResults(...args),
}));

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const baseParams = {
  alertsIndexPattern: '.alerts',
  anonymizationFields: [],
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  authenticatedUser: {} as never,
  defaultAlertRetrievalWorkflowId: 'legacy',
  eventLogger: {} as never,
  eventLogIndex: '.kibana-event-log-test',
  executionUuid: 'test-execution-uuid',
  logger: mockLogger,
  request: {} as never,
  spaceId: 'default',
  workflowConfig: {
    alert_retrieval_workflow_ids: [],
    default_alert_retrieval_mode: 'custom_query' as const,
    validation_workflow_id: 'default',
  },
  workflowsManagementApi: {} as never,
};

const mockCombinedResult = {
  alerts: ['alert-1'],
  alertsContextCount: 1,
  anonymizedAlerts: [],
  apiConfig: baseParams.apiConfig,
  connectorName: 'Test Connector',
  replacements: {},
  workflowExecutions: [],
  workflowId: 'legacy',
  workflowRunId: 'legacy-run',
};

describe('runRetrievalStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateLegacyRetrievalPromise.mockResolvedValue(null);
    mockInvokeCustomAlertRetrievalWorkflows.mockResolvedValue([]);
    mockResolveLegacySettledResult.mockReturnValue(null);
    mockResolveCustomSettledResults.mockReturnValue([]);
    mockCombineAlertRetrievalResults.mockReturnValue(mockCombinedResult);
  });

  it('calls logHealthCheck with retrieval preconditions', async () => {
    await runRetrievalStep(baseParams);

    expect(mockLogHealthCheck).toHaveBeenCalledWith(mockLogger, 'retrieval', {
      alertsIndexPattern: '.alerts',
      anonymizationFieldCount: 0,
      connectorId: 'test-connector-id',
      customWorkflowIds: [],
      defaultAlertRetrievalWorkflowId: 'legacy',
      retrievalMode: 'custom_query',
    });
  });

  it('calls createLegacyRetrievalPromise with the correct params', async () => {
    await runRetrievalStep(baseParams);

    expect(mockCreateLegacyRetrievalPromise).toHaveBeenCalledWith(
      expect.objectContaining({
        alertsIndexPattern: '.alerts',
        defaultAlertRetrievalMode: 'custom_query' as const,
        defaultAlertRetrievalWorkflowId: 'legacy',
      })
    );
  });

  it('calls invokeCustomAlertRetrievalWorkflows with workflow IDs from config', async () => {
    await runRetrievalStep({
      ...baseParams,
      workflowConfig: {
        ...baseParams.workflowConfig,
        alert_retrieval_workflow_ids: ['custom-1', 'custom-2'],
      },
    });

    expect(mockInvokeCustomAlertRetrievalWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowIds: ['custom-1', 'custom-2'],
      })
    );
  });

  it('logs when default retrieval is disabled', async () => {
    await runRetrievalStep({
      ...baseParams,
      workflowConfig: {
        ...baseParams.workflowConfig,
        default_alert_retrieval_mode: 'disabled' as const,
      },
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Default alert retrieval disabled; skipping');
  });

  it('returns the combined alert retrieval result', async () => {
    const result = await runRetrievalStep(baseParams);

    expect(result).toEqual(mockCombinedResult);
  });

  it('calls validateRetrievalResults before combining', async () => {
    const legacyResult = { alerts: [], alertsContextCount: 0 };
    const customResults = [{ alerts: ['a'], alertsContextCount: 1 }];

    mockResolveLegacySettledResult.mockReturnValue(legacyResult);
    mockResolveCustomSettledResults.mockReturnValue(customResults);

    await runRetrievalStep(baseParams);

    expect(mockValidateRetrievalResults).toHaveBeenCalledWith({
      customResults,
      legacyResult,
    });
  });

  it('logs combined retrieval summary', async () => {
    await runRetrievalStep(baseParams);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Combined alert retrieval completed:')
    );
  });

  it('passes provided_context to createLegacyRetrievalPromise when mode is provided', async () => {
    const providedContext = ['alert context 1', 'alert context 2'];

    await runRetrievalStep({
      ...baseParams,
      workflowConfig: {
        ...baseParams.workflowConfig,
        default_alert_retrieval_mode: 'provided' as const,
        provided_context: providedContext,
      },
    });

    expect(mockCreateLegacyRetrievalPromise).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultAlertRetrievalMode: 'provided',
        providedContext,
      })
    );
  });
});
