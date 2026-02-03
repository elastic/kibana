/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError, from } from 'rxjs';
import type { ElasticsearchClient, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import { HealthDiagnosticServiceImpl } from './health_diagnostic_service';
import { CircuitBreakingQueryExecutorImpl } from './health_diagnostic_receiver';
import { ValidationError } from './health_diagnostic_circuit_breakers.types';
import { artifactService } from '../artifact';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';
import {
  createMockLogger,
  createMockTaskManager,
  createMockAnalytics,
  createMockTelemetryConfigProvider,
  createMockQueryExecutor,
  createMockDocument,
  createMockArtifactData,
} from './__mocks__';

jest.mock('./health_diagnostic_receiver');
jest.mock('../artifact');

const MockedCircuitBreakingQueryExecutorImpl = CircuitBreakingQueryExecutorImpl as jest.MockedClass<
  typeof CircuitBreakingQueryExecutorImpl
>;

describe('Security Solution - Health Diagnostic Queries - HealthDiagnosticService', () => {
  let service: HealthDiagnosticServiceImpl;
  let mockLogger: jest.Mocked<Logger>;
  let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockAnalytics: jest.Mocked<AnalyticsServiceStart>;
  let mockTelemetryConfigProvider: jest.Mocked<TelemetryConfigProvider>;
  let mockQueryExecutor: jest.Mocked<CircuitBreakingQueryExecutorImpl>;

  const mockDocument = createMockDocument();

  const setupMocks = () => {
    mockLogger = createMockLogger();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockTaskManager = createMockTaskManager();
    mockAnalytics = createMockAnalytics();
    mockTelemetryConfigProvider = createMockTelemetryConfigProvider();
    mockQueryExecutor = createMockQueryExecutor();

    MockedCircuitBreakingQueryExecutorImpl.mockImplementation(() => mockQueryExecutor);
    service = new HealthDiagnosticServiceImpl(mockLogger);
  };

  const setupDefaultArtifact = (overrides = {}) => {
    (artifactService.getArtifact as jest.Mock).mockResolvedValue({
      data: createMockArtifactData(overrides),
    });
  };

  const startService = async () => {
    await service.start({
      taskManager: mockTaskManager,
      esClient: mockEsClient,
      analytics: mockAnalytics,
      telemetryConfigProvider: mockTelemetryConfigProvider,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    setupDefaultArtifact();
  });

  describe('runHealthDiagnosticQueries', () => {
    describe('successful execution', () => {
      beforeEach(async () => {
        await startService();
      });

      test('should execute enabled queries that are due for execution', async () => {
        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        mockQueryExecutor.search.mockReturnValue(of(mockDocument));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'test-query',
          passed: true,
          numDocs: 1,
          fieldNames: expect.arrayContaining(['@timestamp', 'user.name', 'event.action']),
        });
        expect(mockQueryExecutor.search).toHaveBeenCalledTimes(1);
        expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(2); // result + stats events
      });

      test('should process multiple documents in batches', async () => {
        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        const documents = Array.from({ length: 5 }, (_, i) =>
          createMockDocument({ _id: `doc${i}` })
        );

        mockQueryExecutor.search.mockReturnValue(from(documents));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result[0].numDocs).toBe(5);
        expect(result[0].passed).toBe(true);
      });

      test('should skip queries that are not due for execution', async () => {
        const recentTimestamp = Date.now() - 1000;
        const lastExecutionByQuery = { 'test-query': recentTimestamp };

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(0);
        expect(mockQueryExecutor.search).not.toHaveBeenCalled();
      });

      test('should skip disabled queries', async () => {
        setupDefaultArtifact({ enabled: false });

        const lastExecutionByQuery = { 'test-query': 1640995200000 };

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(0);
        expect(mockQueryExecutor.search).not.toHaveBeenCalled();
      });

      test('should include circuit breaker stats in successful execution', async () => {
        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        mockQueryExecutor.search.mockReturnValue(of(mockDocument));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result[0].circuitBreakers).toBeDefined();
        expect(typeof result[0].circuitBreakers).toBe('object');
      });
    });

    describe('error handling', () => {
      test('should return empty array when query executor is not available', async () => {
        const lastExecutionByQuery = { 'test-query': 1640995200000 };

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Skipping health diagnostic task because telemetry is disabled',
          expect.anything()
        );
      });

      test('should handle query execution errors', async () => {
        await startService();

        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        const error = new Error('Query execution failed');
        mockQueryExecutor.search.mockReturnValue(throwError(() => error));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'test-query',
          passed: false,
          failure: {
            message: 'Query execution failed',
            reason: undefined,
          },
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error running query',
          expect.objectContaining({ error })
        );
      });

      test('should handle validation errors with circuit breaker results', async () => {
        await startService();

        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        const validationError = new ValidationError({
          circuitBreaker: 'TimeoutCircuitBreaker',
          valid: false,
          message: 'Circuit breaker triggered',
        });
        mockQueryExecutor.search.mockReturnValue(throwError(() => validationError));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result[0]).toMatchObject({
          passed: false,
          failure: {
            message: 'Circuit breaker triggered',
            reason: {
              circuitBreaker: 'TimeoutCircuitBreaker',
              valid: false,
              message: 'Circuit breaker triggered',
            },
          },
        });
      });

      test('should handle artifact service errors gracefully', async () => {
        await startService();

        (artifactService.getArtifact as jest.Mock).mockRejectedValue(
          new Error('Artifact not found')
        );
        const lastExecutionByQuery = {};

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toEqual([]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Error getting health diagnostic queries',
          expect.any(Object)
        );
      });
    });

    describe('EBT event reporting', () => {
      beforeEach(async () => {
        await startService();
      });

      test('should report query result and stats events', async () => {
        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        mockQueryExecutor.search.mockReturnValue(of(mockDocument));

        await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(2);

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
          'telemetry_health_diagnostic_query_stats_event',
          expect.objectContaining({
            name: 'test-query',
            passed: true,
            numDocs: 1,
            traceId: expect.any(String),
          })
        );

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
          'telemetry_health_diagnostic_query_result_event',
          expect.objectContaining({
            name: 'test-query',
            queryId: 'test-query-1',
            page: 0,
            data: expect.any(Array),
            traceId: expect.any(String),
          })
        );
      });

      test('should handle EBT reporting errors gracefully', async () => {
        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        mockQueryExecutor.search.mockReturnValue(of(mockDocument));
        mockAnalytics.reportEvent.mockImplementation(() => {
          throw new Error('EBT reporting failed');
        });

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result[0].passed).toBe(true);
        expect(mockLogger.warn).toHaveBeenCalledWith('Error sending EBT', expect.any(Object));
      });

      test('should send EBT events even when query returns no results', async () => {
        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        mockQueryExecutor.search.mockReturnValue(from([]));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'test-query',
          passed: true,
          numDocs: 0,
        });

        expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(2);

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
          'telemetry_health_diagnostic_query_result_event',
          expect.objectContaining({
            name: 'test-query',
            queryId: 'test-query-1',
            page: 0,
            data: [],
            traceId: expect.any(String),
          })
        );

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
          'telemetry_health_diagnostic_query_stats_event',
          expect.objectContaining({
            name: 'test-query',
            passed: true,
            numDocs: 0,
            traceId: expect.any(String),
          })
        );
      });
    });

    describe('telemetry opt-out behavior', () => {
      beforeEach(async () => {
        await startService();
      });

      test('should skip queries and return empty array when telemetry is opted out', async () => {
        mockTelemetryConfigProvider.getIsOptedIn.mockReturnValue(false);
        const lastExecutionByQuery = { 'test-query': 1640995200000 };

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Skipping health diagnostic task because telemetry is disabled',
          expect.anything()
        );
        expect(mockQueryExecutor.search).not.toHaveBeenCalled();
        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
      });

      test('should skip queries when telemetry config provider returns undefined', async () => {
        mockTelemetryConfigProvider.getIsOptedIn.mockReturnValue(undefined);
        const lastExecutionByQuery = { 'test-query': 1640995200000 };

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Skipping health diagnostic task because telemetry is disabled',
          expect.anything()
        );
        expect(mockQueryExecutor.search).not.toHaveBeenCalled();
        expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
      });

      test('should run queries when telemetry is opted in', async () => {
        mockTelemetryConfigProvider.getIsOptedIn.mockReturnValue(true);
        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        mockQueryExecutor.search.mockReturnValue(of(mockDocument));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'test-query',
          passed: true,
          numDocs: 1,
        });
        expect(mockQueryExecutor.search).toHaveBeenCalledTimes(1);
        expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(2);
      });
    });
  });
});
