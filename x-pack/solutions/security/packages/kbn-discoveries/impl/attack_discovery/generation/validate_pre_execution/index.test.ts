/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { DefaultWorkflowIds } from '../types';

import { validatePreExecution } from '.';

const mockDefaultWorkflowIds: DefaultWorkflowIds = {
  default_alert_retrieval: 'workflow-default-alert-retrieval',
  generation: 'workflow-generation',
  validate: 'workflow-validate',
};

describe('validatePreExecution', () => {
  let mockLogger: MockedLogger;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockResolveConnector: jest.Mock;
  let mockWorkflowsManagementApi: Record<string, jest.Mock>;

  beforeEach(() => {
    mockLogger = loggerMock.create();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockResolveConnector = jest.fn().mockResolvedValue({ id: 'test-connector', name: 'Test' });
    mockWorkflowsManagementApi = { getWorkflow: jest.fn() };

    mockEsClient.indices.exists.mockResolvedValue(true);
  });

  it('returns valid with no issues when all checks pass', async () => {
    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('logs debug when all checks pass', async () => {
    await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  it('returns critical issue when workflowsManagementApi is null', async () => {
    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: undefined,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'workflowsManagementApi',
        severity: 'critical',
      })
    );
  });

  it('returns critical issue when defaultWorkflowIds is null', async () => {
    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: null,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'defaultWorkflowIds',
        severity: 'critical',
      })
    );
  });

  it('returns warning issue when alerts index does not exist', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);

    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'alertsIndex',
        severity: 'warning',
      })
    );
  });

  it('returns warning issue when alerts index check throws', async () => {
    mockEsClient.indices.exists.mockRejectedValue(new Error('index_not_found_exception'));

    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'alertsIndex',
        severity: 'warning',
      })
    );
  });

  it('returns warning issue when connector is not accessible', async () => {
    mockResolveConnector.mockRejectedValue(new Error('Connector not found'));

    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'connectorAccessibility',
        severity: 'warning',
      })
    );
  });

  it('returns warning issue when connectorId is empty', async () => {
    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: '',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'connectorAccessibility',
        severity: 'warning',
      })
    );
  });

  it('logs WARN for critical issues', async () => {
    await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: null,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: undefined,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('critical'));
  });

  it('logs WARN for warning issues', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);

    await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('warning'));
  });

  it('collects all issues when multiple checks fail', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);
    mockResolveConnector.mockRejectedValue(new Error('Connector not found'));

    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      defaultWorkflowIds: null,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: undefined,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('does not call resolveConnector when connectorId is empty', async () => {
    await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: '',
      defaultWorkflowIds: mockDefaultWorkflowIds,
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(mockResolveConnector).not.toHaveBeenCalled();
  });
});
