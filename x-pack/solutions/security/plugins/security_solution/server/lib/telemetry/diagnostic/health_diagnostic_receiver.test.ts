/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CircuitBreakingQueryExecutorImpl } from './health_diagnostic_receiver';
import { QueryType, PermissionError } from './health_diagnostic_service.types';
import { ValidationError } from './health_diagnostic_circuit_breakers.types';
import {
  createMockLogger,
  createMockEsClient,
  createMockCircuitBreaker,
  createMockQueryV1,
  createMockQueryV2,
  createMockSearchResponse,
  createMockEqlResponse,
  setupPointInTime,
  executeObservableTest,
  type HealthDiagnosticQueryV1,
  type HealthDiagnosticQueryV2,
} from './__mocks__';

describe('Security Solution - Health Diagnostic Queries - CircuitBreakingQueryExecutor', () => {
  let queryExecutor: CircuitBreakingQueryExecutorImpl;
  let mockEsClient: ReturnType<typeof createMockEsClient>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  const mkExecV1 = (type: QueryType, overrides: Partial<HealthDiagnosticQueryV1> = {}) => ({
    kind: 'executable' as const,
    query: createMockQueryV1(type, overrides),
  });

  const mkExecV2 = (
    type: QueryType,
    overrides: Partial<HealthDiagnosticQueryV2> = {},
    indices = ['logs-endpoint.events.process-default']
  ) => ({
    kind: 'executable' as const,
    query: createMockQueryV2(type, overrides),
    resolution: {
      name: 'endpoint',
      version: '8.14.2',
      indices,
    },
  });

  beforeEach(() => {
    mockEsClient = createMockEsClient();
    mockLogger = createMockLogger();
    queryExecutor = new CircuitBreakingQueryExecutorImpl(mockEsClient as any, false, mockLogger); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  describe('DSL queries', () => {
    const mockDocument = { '@timestamp': '2023-01-01T00:00:00Z', user: { name: 'test-user' } };

    beforeEach(() => {
      setupPointInTime(mockEsClient);
    });

    test('should run DSL query successfully', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreakers = [createMockCircuitBreaker(true)];

      mockEsClient.search
        .mockResolvedValueOnce(createMockSearchResponse([mockDocument]))
        .mockResolvedValueOnce(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers }),
        (results, completed) => {
          expect(results).toHaveLength(1);
          expect(results[0]).toEqual(mockDocument);
          expect(mockEsClient.openPointInTime).toHaveBeenCalledWith({
            index: ['test-index'],
            keep_alive: '1m',
          });
          expect(mockEsClient.search).toHaveBeenCalledTimes(2);
          // small delay for finalize to execute
          setTimeout(() => {
            expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'test-pit-id' });
            completed();
          }, 10);
        },
        done
      );
    });

    test('should handle DSL query with aggregations', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);
      const aggregations = { bucket_count: { value: 42 } };

      mockEsClient.search.mockResolvedValueOnce(createMockSearchResponse([], aggregations));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(1);
          expect(results[0]).toEqual(aggregations);
          done();
        },
        done
      );
    });

    test('should handle multiple pages of DSL results', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);
      const doc1 = { ...mockDocument, id: 1 };
      const doc2 = { ...mockDocument, id: 2 };

      mockEsClient.search
        .mockResolvedValueOnce(createMockSearchResponse([doc1], undefined, 'test-pit-id-1'))
        .mockResolvedValueOnce(createMockSearchResponse([doc2], undefined, 'test-pit-id-2'))
        .mockResolvedValueOnce(createMockSearchResponse([], undefined, 'test-pit-id-3'));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(2);
          expect(results[0]).toEqual(doc1);
          expect(results[1]).toEqual(doc2);
          expect(mockEsClient.search).toHaveBeenCalledTimes(3);

          expect(mockEsClient.search.mock.calls[0][0]).toMatchObject({
            pit: { id: 'test-pit-id' },
          });
          expect(mockEsClient.search.mock.calls[1][0]).toMatchObject({
            pit: { id: 'test-pit-id-1' },
          });
          expect(mockEsClient.search.mock.calls[2][0]).toMatchObject({
            pit: { id: 'test-pit-id-2' },
          });

          // small delay for finalize to execute
          setTimeout(() => {
            expect(mockEsClient.closePointInTime).toHaveBeenCalledWith({ id: 'test-pit-id-3' });
            done();
          }, 10);
        },
        done
      );
    });

    test('should handle queries with tiers filtering', (done) => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot', 'warm'] });
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({
        indices: {
          'test-index-000001': { phase: 'hot' },
          'test-index-000002': { phase: 'warm' },
          'test-index-000003': { phase: 'cold' },
        },
      });

      mockEsClient.search.mockResolvedValue(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.ilm.explainLifecycle).toHaveBeenCalledWith({
            index: 'test-index',
            only_managed: false,
            filter_path: ['indices.*.phase'],
          });
          done();
        },
        done
      );
    });

    it('streamDSL uses resolved indices from v2 ExecutableQuery', async () => {
      const execQuery = mkExecV2(QueryType.DSL, {}, ['logs-endpoint.events.process-default']);
      setupPointInTime(mockEsClient, 'pit-id');
      mockEsClient.search.mockResolvedValueOnce(createMockSearchResponse([], undefined, 'pit-id'));

      await new Promise<void>((resolve) => {
        queryExecutor.streamDSL(execQuery, new AbortController().signal).subscribe({
          complete: resolve,
          error: resolve,
        });
      });

      expect(mockEsClient.openPointInTime).toHaveBeenCalledWith(
        expect.objectContaining({ index: ['logs-endpoint.events.process-default'] })
      );
    });
  });

  describe('EQL queries', () => {
    const mockEvents = [
      { _source: { '@timestamp': '2023-01-01T00:00:00Z', event: { action: 'login' } } },
      { _source: { '@timestamp': '2023-01-01T00:01:00Z', event: { action: 'logout' } } },
    ];

    beforeEach(() => {
      mockEsClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: true });
    });

    test('should run EQL query with events successfully', (done) => {
      const execQuery = mkExecV1(QueryType.EQL, {
        query: 'process where process.name == "cmd.exe"',
      });
      const circuitBreaker = createMockCircuitBreaker(true);
      const eventSources = mockEvents.map((e) => e._source);

      mockEsClient.eql.search.mockResolvedValue(createMockEqlResponse(eventSources));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(2);
          expect(results[0]).toEqual(eventSources[0]);
          expect(results[1]).toEqual(eventSources[1]);
          expect(mockEsClient.eql.search).toHaveBeenCalledWith(
            {
              index: ['test-index'],
              query: 'process where process.name == "cmd.exe"',
              size: 100,
            },
            { signal: expect.any(AbortSignal) }
          );
          done();
        },
        done
      );
    });

    test('should run EQL query with sequences successfully', (done) => {
      const execQuery = mkExecV1(QueryType.EQL, {
        query: 'sequence [process where true] [network where true]',
      });
      const circuitBreaker = createMockCircuitBreaker(true);

      const mockSequences = [
        {
          events: [
            { _source: { '@timestamp': '2023-01-01T00:00:00Z', process: { name: 'cmd.exe' } } },
            { _source: { '@timestamp': '2023-01-01T00:01:00Z', network: { protocol: 'tcp' } } },
          ],
        },
      ];

      mockEsClient.eql.search.mockResolvedValue(createMockEqlResponse(undefined, mockSequences));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(1);
          expect(results[0]).toEqual(mockSequences[0].events.map((e) => e._source));
          done();
        },
        done
      );
    });

    test('should handle EQL query with no results', (done) => {
      const execQuery = mkExecV1(QueryType.EQL);
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.eql.search.mockResolvedValue({ hits: {} });

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(0);
          done();
        },
        done
      );
    });
  });

  describe('ES|QL queries', () => {
    beforeEach(() => {
      mockEsClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: true });
    });

    test('should run ES|QL query successfully', (done) => {
      const execQuery = mkExecV1(QueryType.ESQL, { query: 'stats count() by user.name' });
      const circuitBreaker = createMockCircuitBreaker(true);

      const mockRecords = [
        { 'user.name': 'john', 'count()': 5 },
        { 'user.name': 'jane', 'count()': 3 },
      ];

      const mockToRecords = jest.fn().mockResolvedValue({ records: mockRecords });
      mockEsClient.helpers.esql.mockReturnValue({ toRecords: mockToRecords });

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(2);
          expect(results[0]).toEqual(mockRecords[0]);
          expect(results[1]).toEqual(mockRecords[1]);
          expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
            { query: 'FROM test-index | stats count() by user.name' },
            { signal: expect.any(AbortSignal) }
          );
          done();
        },
        done
      );
    });

    test('v2 ESQL query with FROM clause errors without calling esql', (done) => {
      const execQuery = mkExecV2(QueryType.ESQL, {
        query: 'FROM logs-* | stats count() by user.name',
      });
      const circuitBreaker = createMockCircuitBreaker(true);

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => done(new Error('Should not emit')),
        error: (error) => {
          try {
            expect(error.message).toContain('FROM clause');
            expect(mockEsClient.helpers.esql).not.toHaveBeenCalled();
            done();
          } catch (e) {
            done(e);
          }
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });

    test('should not inject FROM prefix when v1 query starts with lowercase from', (done) => {
      const execQuery = mkExecV1(QueryType.ESQL, {
        query: 'from logs-* | stats count() by user.name',
      });
      const circuitBreaker = createMockCircuitBreaker(true);

      const mockRecords = [{ 'user.name': 'test', 'count()': 1 }];
      const mockToRecords = jest.fn().mockResolvedValue({ records: mockRecords });
      mockEsClient.helpers.esql.mockReturnValue({ toRecords: mockToRecords });

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
            { query: 'from logs-* | stats count() by user.name' },
            { signal: expect.any(AbortSignal) }
          );
          done();
        },
        done
      );
    });

    test('should handle ES|QL query with FROM clause already present', (done) => {
      const execQuery = mkExecV1(QueryType.ESQL, {
        query: 'FROM logs-* | stats count() by user.name',
      });
      const circuitBreaker = createMockCircuitBreaker(true);

      const mockRecords = [{ 'user.name': 'test', 'count()': 1 }];
      const mockToRecords = jest.fn().mockResolvedValue({ records: mockRecords });
      mockEsClient.helpers.esql.mockReturnValue({ toRecords: mockToRecords });

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
            { query: 'FROM logs-* | stats count() by user.name' },
            { signal: expect.any(AbortSignal) }
          );
          done();
        },
        done
      );
    });
  });

  describe('Circuit breaker functionality', () => {
    test('should trigger circuit breaker and abort query', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(false, 10);

      setupPointInTime(mockEsClient);
      mockEsClient.search.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  took: 1,
                  timed_out: false,
                  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                  hits: {
                    hits: [],
                    total: { value: 0, relation: 'eq' },
                    max_score: null,
                  },
                }),
              100
            )
          )
      );

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: (error) => {
          try {
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.result.message).toBe('Circuit breaker triggered');
            expect(error.result.circuitBreaker).toBe('TestCircuitBreaker');
            done();
          } catch (e) {
            done(e);
          }
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });
  });

  describe('Error handling', () => {
    test('should handle Elasticsearch search errors', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);

      setupPointInTime(mockEsClient);
      mockEsClient.ilm.explainLifecycle.mockResolvedValue({
        indices: { 'test-index-000001': { phase: 'hot' } },
      });
      mockEsClient.search.mockRejectedValue(new Error('Elasticsearch error'));

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: (error) => {
          expect(error.message).toBe('Elasticsearch error');
          done();
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });

    test('should handle unsupported query type', () => {
      const execQuery = mkExecV1('INVALID' as QueryType);
      const circuitBreaker = createMockCircuitBreaker(true);

      expect(() => {
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] });
      }).toThrow('Unhandled QueryType: INVALID');
    });

    test('should handle ILM explain lifecycle errors gracefully', (done) => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({ indices: undefined });
      setupPointInTime(mockEsClient);
      mockEsClient.search.mockResolvedValue(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.openPointInTime).toHaveBeenCalledWith({
            index: ['test-index'],
            keep_alive: '1m',
          });
          done();
        },
        done
      );
    });

    test('should handle ILM API errors and assume serverless', (done) => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot', 'warm'] });
      const circuitBreaker = createMockCircuitBreaker(true);

      const ilmError = new Error(
        'no handler found for uri [/.alerts-security.alerts*/_ilm/explain?only_managed=false&filter_path=indices.*.phase] and method [GET]'
      );
      mockEsClient.ilm.explainLifecycle.mockRejectedValue(ilmError);
      setupPointInTime(mockEsClient);
      mockEsClient.search.mockResolvedValue(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.ilm.explainLifecycle).toHaveBeenCalledWith({
            index: 'test-index',
            only_managed: false,
            filter_path: ['indices.*.phase'],
          });
          expect(mockEsClient.openPointInTime).toHaveBeenCalledWith({
            index: ['test-index'],
            keep_alive: '1m',
          });
          done();
        },
        done
      );
    });

    test('should handle network errors during ILM checks', (done) => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });
      const circuitBreaker = createMockCircuitBreaker(true);

      const networkError = new Error('ECONNREFUSED');
      mockEsClient.ilm.explainLifecycle.mockRejectedValue(networkError);
      setupPointInTime(mockEsClient);
      mockEsClient.search.mockResolvedValue(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.openPointInTime).toHaveBeenCalledWith({
            index: ['test-index'],
            keep_alive: '1m',
          });
          done();
        },
        done
      );
    });

    test('should handle malformed ILM responses', (done) => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({});
      setupPointInTime(mockEsClient);
      mockEsClient.search.mockResolvedValue(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.openPointInTime).toHaveBeenCalledWith({
            index: ['test-index'],
            keep_alive: '1m',
          });
          done();
        },
        done
      );
    });
  });

  describe('Permission checking', () => {
    test('should proceed when has read privileges', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);

      setupPointInTime(mockEsClient);
      mockEsClient.search.mockResolvedValue(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }),
        () => {
          expect(mockEsClient.security.hasPrivileges).toHaveBeenCalledWith({
            index: [{ names: ['test-index'], privileges: ['read'] }],
          });
          expect(mockEsClient.openPointInTime).toHaveBeenCalled();
          done();
        },
        done
      );
    });

    test('should throw PermissionError when missing read privileges', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: false });

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: (error) => {
          expect(error).toBeInstanceOf(PermissionError);
          expect(error.message).toContain('Error checking privileges');
          expect(mockEsClient.openPointInTime).not.toHaveBeenCalled();
          done();
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });

    test('should throw PermissionError when security.hasPrivileges throws', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.security.hasPrivileges.mockRejectedValue(new Error('security_exception'));

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: (error) => {
          expect(error).toBeInstanceOf(PermissionError);
          expect(error.message).toContain('Error checking privileges');
          expect(error.message).toContain('security_exception');
          expect(mockEsClient.openPointInTime).not.toHaveBeenCalled();
          done();
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });

    test('should not call closePointInTime when permission check fails', (done) => {
      const execQuery = mkExecV1(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.security.hasPrivileges.mockRejectedValue(new Error('no access'));

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: () => {
          setTimeout(() => {
            expect(mockEsClient.closePointInTime).not.toHaveBeenCalled();
            done();
          }, 10);
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });

    test('should throw PermissionError for EQL when missing read privileges', (done) => {
      const execQuery = mkExecV1(QueryType.EQL);
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: false });

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: (error) => {
          expect(error).toBeInstanceOf(PermissionError);
          expect(error.message).toContain('Error checking privileges');
          expect(mockEsClient.eql.search).not.toHaveBeenCalled();
          done();
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });

    test('should throw PermissionError for ESQL when missing read privileges', (done) => {
      const execQuery = mkExecV1(QueryType.ESQL, { query: 'stats count() by user.name' });
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.security.hasPrivileges.mockResolvedValue({ has_all_requested: false });

      queryExecutor.search({ query: execQuery, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: (error) => {
          expect(error).toBeInstanceOf(PermissionError);
          expect(error.message).toContain('Error checking privileges');
          expect(mockEsClient.helpers.esql).not.toHaveBeenCalled();
          done();
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });
  });

  describe('indicesFor method', () => {
    test('should return original index when no tiers are specified', async () => {
      const execQuery = mkExecV1(QueryType.DSL);
      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index']);
      expect(mockEsClient.ilm.explainLifecycle).not.toHaveBeenCalled();
    });

    test('should return original index on serverless when no tiers are specified', async () => {
      const serverlessExecutor = new CircuitBreakingQueryExecutorImpl(
        mockEsClient as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        true,
        mockLogger
      );
      const query = mkExecV1(QueryType.DSL);
      const result = await serverlessExecutor.indicesFor(query);
      expect(result).toEqual(['test-index']);
      expect(mockEsClient.ilm.explainLifecycle).not.toHaveBeenCalled();
    });

    test('should return original index on serverless even when tiers are specified', async () => {
      const serverlessExecutor = new CircuitBreakingQueryExecutorImpl(
        mockEsClient as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        true,
        mockLogger
      );
      const query = mkExecV1(QueryType.DSL, { tiers: ['hot', 'warm'] });
      const result = await serverlessExecutor.indicesFor(query);
      expect(result).toEqual(['test-index']);
      expect(mockEsClient.ilm.explainLifecycle).not.toHaveBeenCalled();
    });

    test('should filter indices by tiers when ILM is available', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot', 'warm'] });

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({
        indices: {
          'test-index-000001': { phase: 'hot' },
          'test-index-000002': { phase: 'warm' },
          'test-index-000003': { phase: 'cold' },
          'test-index-000004': { phase: 'hot' },
        },
      });

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index-000001', 'test-index-000002', 'test-index-000004']);
      expect(mockEsClient.ilm.explainLifecycle).toHaveBeenCalledWith({
        index: 'test-index',
        only_managed: false,
        filter_path: ['indices.*.phase'],
      });
    });

    test('should handle serverless environment (undefined indices)', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({ indices: undefined });

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index']);
    });

    test('should handle empty ILM response', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({});

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index']);
    });

    test('should handle indices without phase information', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({
        indices: {
          'test-index-000001': { phase: 'hot' },
          'test-index-000002': {},
          'test-index-000003': { other_field: 'value' },
        },
      });

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index-000001']);
    });

    test('should filter out indices not in specified tiers', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({
        indices: {
          'test-index-000001': { phase: 'hot' },
          'test-index-000002': { phase: 'warm' },
          'test-index-000003': { phase: 'cold' },
        },
      });

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index-000001']);
    });

    test('should handle ILM API errors by falling back to original index', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });

      const serverlessError = new Error(
        'no handler found for uri [/.alerts-security.alerts*/_ilm/explain?only_managed=false&filter_path=indices.*.phase] and method [GET]'
      );
      mockEsClient.ilm.explainLifecycle.mockRejectedValue(serverlessError);

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index']);
    });

    test('should handle authorization errors gracefully', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['hot'] });

      const authError = new Error('security_exception');
      mockEsClient.ilm.explainLifecycle.mockRejectedValue(authError);

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual(['test-index']);
    });

    test('should return empty array when no indices match tiers', async () => {
      const execQuery = mkExecV1(QueryType.DSL, { tiers: ['frozen'] });

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({
        indices: {
          'test-index-000001': { phase: 'hot' },
          'test-index-000002': { phase: 'warm' },
          'test-index-000003': { phase: 'cold' },
        },
      });

      const result = await queryExecutor.indicesFor(execQuery);
      expect(result).toEqual([]);
    });
  });
});
