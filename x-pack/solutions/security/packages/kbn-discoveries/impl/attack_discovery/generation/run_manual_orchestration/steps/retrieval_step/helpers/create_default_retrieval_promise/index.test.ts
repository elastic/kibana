/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { createDefaultRetrievalPromise } from '.';

const mockInvokeAlertRetrievalWorkflow = jest.fn();

jest.mock('../../../../../invoke_alert_retrieval_workflow', () => ({
  invokeAlertRetrievalWorkflow: (...args: unknown[]) => mockInvokeAlertRetrievalWorkflow(...args),
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
  defaultAlertRetrievalWorkflowId: 'default',
  defaultRetrievalEnabled: true,
  eventLogger: {} as never,
  eventLogIndex: '.kibana-event-log-test',
  executionUuid: 'test-execution-uuid',
  logger: mockLogger,
  request: {} as never,
  spaceId: 'default',
  workflowsManagementApi: {} as never,
};

describe('createDefaultRetrievalPromise', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockInvokeAlertRetrievalWorkflow.mockResolvedValue({
      alerts: ['alert-1'],
      alertsContextCount: 1,
      anonymizedAlerts: [],
      apiConfig: baseParams.apiConfig,
      connectorName: 'Test Connector',
      replacements: {},
      workflowId: 'default',
      workflowRunId: 'default-run',
    });
  });

  it('invokes the default alert retrieval workflow when default_retrieval_enabled is true (custom_query)', async () => {
    const result = await createDefaultRetrievalPromise({
      ...baseParams,
      alertRetrievalMode: 'custom_query' as const,
    });

    expect(mockInvokeAlertRetrievalWorkflow).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        alerts: ['alert-1'],
        alertsContextCount: 1,
      })
    );
  });

  it('resolves to null and does not invoke retrieval when default_retrieval_enabled is false', async () => {
    const result = await createDefaultRetrievalPromise({
      ...baseParams,
      alertRetrievalMode: 'custom_query' as const,
      defaultRetrievalEnabled: false,
    });

    expect(mockInvokeAlertRetrievalWorkflow).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('passes maxWaitMs to invokeAlertRetrievalWorkflow', async () => {
    await createDefaultRetrievalPromise({
      ...baseParams,
      alertRetrievalMode: 'custom_query' as const,
      maxWaitMs: 15 * 60 * 1000,
    });

    expect(mockInvokeAlertRetrievalWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        maxWaitMs: 15 * 60 * 1000,
      })
    );
  });

  it('passes the default workflow id to invokeAlertRetrievalWorkflow', async () => {
    await createDefaultRetrievalPromise({
      ...baseParams,
      alertRetrievalMode: 'custom_query' as const,
      defaultAlertRetrievalWorkflowId: 'custom-default-id',
    });

    expect(mockInvokeAlertRetrievalWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'custom-default-id',
      })
    );
  });

  it('passes anonymizationFields to invokeAlertRetrievalWorkflow', async () => {
    const anonymizationFields = [{ allowed: true, anonymized: false, field: 'host.name', id: '1' }];

    await createDefaultRetrievalPromise({
      ...baseParams,
      alertRetrievalMode: 'custom_query' as const,
      anonymizationFields,
    });

    expect(mockInvokeAlertRetrievalWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymizationFields,
      })
    );
  });

  it('passes esqlQuery when mode is esql', async () => {
    await createDefaultRetrievalPromise({
      ...baseParams,
      alertRetrievalMode: 'esql' as const,
      esqlQuery: 'FROM .alerts | LIMIT 10',
    });

    expect(mockInvokeAlertRetrievalWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'FROM .alerts | LIMIT 10',
      })
    );
  });

  it('does NOT pass esqlQuery when mode is custom_query', async () => {
    await createDefaultRetrievalPromise({
      ...baseParams,
      alertRetrievalMode: 'custom_query' as const,
      esqlQuery: 'FROM .alerts | LIMIT 10',
    });

    expect(mockInvokeAlertRetrievalWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: undefined,
      })
    );
  });
});
