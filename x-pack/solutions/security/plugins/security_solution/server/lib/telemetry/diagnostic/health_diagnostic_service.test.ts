/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError, from } from 'rxjs';
import type { ElasticsearchClient, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import { HealthDiagnosticServiceImpl } from './health_diagnostic_service';
import { CircuitBreakingQueryExecutorImpl } from './health_diagnostic_receiver';
import { ValidationError } from './health_diagnostic_circuit_breakers.types';
import { PermissionError } from './health_diagnostic_service.types';
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
  createMockPackageService,
} from './__mocks__';
import { TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT } from '../event_based/events';

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
  let mockPackageService: ReturnType<typeof createMockPackageService>;

  const mockDocument = createMockDocument();

  const setupMocks = () => {
    mockLogger = createMockLogger();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockTaskManager = createMockTaskManager();
    mockAnalytics = createMockAnalytics();
    mockTelemetryConfigProvider = createMockTelemetryConfigProvider();
    mockQueryExecutor = createMockQueryExecutor();
    mockPackageService = createMockPackageService([]);

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
      esClient: mockEsClient as unknown as ElasticsearchClient,
      analytics: mockAnalytics,
      telemetryConfigProvider: mockTelemetryConfigProvider,
      packageService: mockPackageService as unknown as PackageService,
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
          status: 'success',
          descriptorVersion: 1,
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

      describe('query attribute filtering', () => {
        test('should emit a skipped stat for queries with unrecognised versions', async () => {
          (artifactService.getArtifact as jest.Mock).mockResolvedValue({
            data: `---
id: unknown-version-query
name: unknown-version-query
version: 99
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`,
          });

          const result = await service.runHealthDiagnosticQueries({});

          expect(result).toHaveLength(1);
          expect(result[0]).toMatchObject({
            name: 'unknown-version-query',
            status: 'skipped',
            skipReason: 'parse_failure',
            passed: false,
          });
          expect(mockQueryExecutor.search).not.toHaveBeenCalled();
          expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
            TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT.eventType,
            expect.objectContaining({ status: 'skipped', skipReason: 'parse_failure' })
          );
        });

        test('should emit a skipped stat for queries missing the enabled attribute', async () => {
          (artifactService.getArtifact as jest.Mock).mockResolvedValue({
            data: `---
id: no-enabled-query
name: no-enabled-query
index: test-index
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep`,
          });

          const result = await service.runHealthDiagnosticQueries({});

          expect(result).toHaveLength(1);
          expect(result[0]).toMatchObject({
            status: 'skipped',
            skipReason: 'parse_failure',
            passed: false,
          });
          expect(mockQueryExecutor.search).not.toHaveBeenCalled();
        });

        test('should execute valid queries and emit skipped stats for unknown-version queries', async () => {
          (artifactService.getArtifact as jest.Mock).mockResolvedValue({
            data: `---
id: valid-query-1
name: valid-query-1
index: test-index
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true
---
id: unknown-version-query
name: unknown-version-query
version: 99
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`,
          });

          mockQueryExecutor.search.mockReturnValue(of(mockDocument));

          const result = await service.runHealthDiagnosticQueries({});

          expect(result).toHaveLength(2);
          const validResult = result.find((r) => r.name === 'valid-query-1');
          const unknownResult = result.find((r) => r.name === 'unknown-version-query');
          expect(validResult).toMatchObject({ status: 'success', passed: true });
          expect(unknownResult).toMatchObject({
            status: 'skipped',
            skipReason: 'parse_failure',
            passed: false,
          });
          expect(mockQueryExecutor.search).toHaveBeenCalledTimes(1);
        });
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

      test('should return failed stat when search() throws synchronously instead of rejecting the batch', async () => {
        await startService();

        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        const error = new Error('Unhandled QueryType: UNKNOWN');
        mockQueryExecutor.search.mockImplementation(() => {
          throw error;
        });

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'test-query',
          passed: false,
          status: 'failed',
          failure: { message: 'Unhandled QueryType: UNKNOWN' },
        });
        expect(mockLogger.warn).toHaveBeenCalledWith('Error running query', expect.any(Object));
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
          status: 'failed',
          descriptorVersion: 1,
          failure: {
            message: 'Query execution failed',
            reason: undefined,
          },
        });
        expect(mockLogger.warn).toHaveBeenCalledWith(
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

      test('should log debug (not warn) for PermissionError', async () => {
        await startService();

        const lastExecutionByQuery = { 'test-query': 1640995200000 };
        const permissionError = new PermissionError('Missing read privileges');
        mockQueryExecutor.search.mockReturnValue(throwError(() => permissionError));

        const result = await service.runHealthDiagnosticQueries(lastExecutionByQuery);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'test-query',
          passed: false,
          failure: {
            message: 'Missing read privileges',
            reason: undefined,
          },
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Permission error running query.',
          expect.objectContaining({ error: permissionError })
        );
        expect(mockLogger.warn).not.toHaveBeenCalled();
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

      it('reports per-integration stats for a successful v2 query', async () => {
        mockPackageService.asInternalUser.getPackages.mockResolvedValue([
          {
            name: 'endpoint',
            version: '8.14.2',
            status: 'installed',
            data_streams: [
              { dataset: 'endpoint.events.process', type: 'logs' },
              { dataset: 'endpoint.events.network', type: 'traces' },
            ],
          },
        ]);

        (artifactService.getArtifact as jest.Mock).mockResolvedValue({
          data: `---
id: test-query-v2
name: test-query-v2
version: 2
integrations: endpoint
datastreamTypes: logs
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`,
        });

        mockQueryExecutor.search.mockReturnValue(of(mockDocument));

        const result = await service.runHealthDiagnosticQueries({});

        expect(result).toHaveLength(1);
        expect(result[0].integration).toMatchObject({
          name: 'endpoint',
          version: '8.14.2',
          indices: ['logs-endpoint.events.process-*'],
        });
      });

      it('emits skipped stats EBT when integration is not installed', async () => {
        mockPackageService.asInternalUser.getPackages.mockResolvedValue([]);

        // Set up artifact with a v2 query descriptor (integrations-based)
        (artifactService.getArtifact as jest.Mock).mockResolvedValue({
          data: `---
id: test-query-v2
name: test-query-v2
version: 2
integrations: endpoint.*
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`,
        });

        await service.runHealthDiagnosticQueries({});

        expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
          TELEMETRY_HEALTH_DIAGNOSTIC_QUERY_STATS_EVENT.eventType,
          expect.objectContaining({
            status: 'skipped',
            skipReason: 'integration_not_installed',
            passed: false,
          })
        );
        expect(mockQueryExecutor.search).not.toHaveBeenCalled();
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
