/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { WorkflowIntegrityResult } from '../types';

import { validatePreExecution } from '.';

const makeIntactResult = (): WorkflowIntegrityResult => ({
  optionalRepaired: [],
  optionalWarnings: [],
  repaired: [],
  status: 'all_intact' as const,
  unrepairableErrors: [],
});

const makeRepairFailedResult = (): WorkflowIntegrityResult => ({
  optionalRepaired: [],
  optionalWarnings: [],
  repaired: [],
  status: 'repair_failed' as const,
  unrepairableErrors: [
    {
      error: 'Workflow is disabled',
      key: 'generation',
      workflowId: 'system-attack-discovery-generation',
    },
  ],
});

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
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('logs debug when all checks pass', async () => {
    await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  it('returns critical issue when workflowsManagementApi is null', async () => {
    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: null,
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

  it('returns critical issue when workflowIntegrityResult.status is repair_failed', async () => {
    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeRepairFailedResult(),
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'managedWorkflowEnabled',
        severity: 'critical',
      })
    );
  });

  it('returns critical issue with check managedWorkflowEnabled when a managed workflow is disabled', async () => {
    const disabledResult: WorkflowIntegrityResult = {
      optionalRepaired: [],
      optionalWarnings: [],
      repaired: [],
      status: 'repair_failed' as const,
      unrepairableErrors: [
        {
          error: 'Workflow is disabled',
          key: 'default_alert_retrieval',
          workflowId: 'system-attack-discovery-alert-retrieval',
        },
      ],
    };

    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: disabledResult,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        check: 'managedWorkflowEnabled',
        severity: 'critical',
      })
    );
  });

  it('returns valid with no workflow issue when workflowIntegrityResult is null but workflowsManagementApi is absent', async () => {
    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: null,
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(result.issues).not.toContainEqual(
      expect.objectContaining({ check: 'managedWorkflowEnabled' })
    );
  });

  it('returns warning issue when alerts index does not exist', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);

    const result = await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
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
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
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
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
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
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
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
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeRepairFailedResult(),
      workflowsManagementApi: undefined,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('critical'));
  });

  it('logs WARN for warning issues', async () => {
    mockEsClient.indices.exists.mockResolvedValue(false);

    await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: 'test-connector-id',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
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
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeRepairFailedResult(),
      workflowsManagementApi: undefined,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('does not call resolveConnector when connectorId is empty', async () => {
    await validatePreExecution({
      alertsIndexPattern: '.alerts-security.alerts-default',
      connectorId: '',
      esClient: mockEsClient,
      logger: mockLogger,
      resolveConnector: mockResolveConnector,
      workflowIntegrityResult: makeIntactResult(),
      workflowsManagementApi: mockWorkflowsManagementApi,
    });

    expect(mockResolveConnector).not.toHaveBeenCalled();
  });
});
