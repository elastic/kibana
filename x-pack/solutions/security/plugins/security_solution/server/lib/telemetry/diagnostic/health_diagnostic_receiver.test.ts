/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CircuitBreakingQueryExecutorImpl } from './health_diagnostic_receiver';
import { QueryType } from './health_diagnostic_service.types';
import { ValidationError } from './health_diagnostic_circuit_breakers.types';
import {
  createMockLogger,
  createMockEsClient,
  createMockCircuitBreaker,
  createMockQuery,
  createMockSearchResponse,
  createMockEqlResponse,
  setupPointInTime,
  executeObservableTest,
} from './__mocks__';

describe('Security Solution - Health Diagnostic Queries - CircuitBreakingQueryExecutor', () => {
  let queryExecutor: CircuitBreakingQueryExecutorImpl;
  let mockEsClient: ReturnType<typeof createMockEsClient>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockEsClient = createMockEsClient();
    mockLogger = createMockLogger();
    queryExecutor = new CircuitBreakingQueryExecutorImpl(mockEsClient as any, mockLogger); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  describe('DSL queries', () => {
    const mockDocument = { '@timestamp': '2023-01-01T00:00:00Z', user: { name: 'test-user' } };

    beforeEach(() => {
      setupPointInTime(mockEsClient);
    });

    test('should run DSL query successfully', (done) => {
      const query = createMockQuery(QueryType.DSL);
      const circuitBreakers = [createMockCircuitBreaker(true)];

      mockEsClient.search
        .mockResolvedValueOnce(createMockSearchResponse([mockDocument]))
        .mockResolvedValueOnce(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers }),
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
      const query = createMockQuery(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);
      const aggregations = { bucket_count: { value: 42 } };

      mockEsClient.search.mockResolvedValueOnce(createMockSearchResponse([], aggregations));

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(1);
          expect(results[0]).toEqual(aggregations);
          done();
        },
        done
      );
    });

    test('should handle multiple pages of DSL results', (done) => {
      const query = createMockQuery(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);
      const doc1 = { ...mockDocument, id: 1 };
      const doc2 = { ...mockDocument, id: 2 };

      mockEsClient.search
        .mockResolvedValueOnce(createMockSearchResponse([doc1]))
        .mockResolvedValueOnce(createMockSearchResponse([doc2]))
        .mockResolvedValueOnce(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(2);
          expect(results[0]).toEqual(doc1);
          expect(results[1]).toEqual(doc2);
          expect(mockEsClient.search).toHaveBeenCalledTimes(3);
          done();
        },
        done
      );
    });

    test('should handle queries with tiers filtering', (done) => {
      const query = createMockQuery(QueryType.DSL, { tiers: ['hot', 'warm'] });
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
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
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
  });

  describe('EQL queries', () => {
    const mockEvents = [
      { _source: { '@timestamp': '2023-01-01T00:00:00Z', event: { action: 'login' } } },
      { _source: { '@timestamp': '2023-01-01T00:01:00Z', event: { action: 'logout' } } },
    ];

    test('should run EQL query with events successfully', (done) => {
      const query = createMockQuery(QueryType.EQL, {
        query: 'process where process.name == "cmd.exe"',
      });
      const circuitBreaker = createMockCircuitBreaker(true);
      const eventSources = mockEvents.map((e) => e._source);

      mockEsClient.eql.search.mockResolvedValue(createMockEqlResponse(eventSources));

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
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
      const query = createMockQuery(QueryType.EQL, {
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
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(1);
          expect(results[0]).toEqual(mockSequences[0].events.map((e) => e._source));
          done();
        },
        done
      );
    });

    test('should handle EQL query with no results', (done) => {
      const query = createMockQuery(QueryType.EQL);
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.eql.search.mockResolvedValue({ hits: {} });

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
        (results) => {
          expect(results).toHaveLength(0);
          done();
        },
        done
      );
    });
  });

  describe('ES|QL queries', () => {
    test('should run ES|QL query successfully', (done) => {
      const query = createMockQuery(QueryType.ESQL, { query: 'stats count() by user.name' });
      const circuitBreaker = createMockCircuitBreaker(true);

      const mockRecords = [
        { 'user.name': 'john', 'count()': 5 },
        { 'user.name': 'jane', 'count()': 3 },
      ];

      const mockToRecords = jest.fn().mockResolvedValue({ records: mockRecords });
      mockEsClient.helpers.esql.mockReturnValue({ toRecords: mockToRecords });

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
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

    test('should handle ES|QL query with FROM clause already present', (done) => {
      const query = createMockQuery(QueryType.ESQL, {
        query: 'FROM logs-* | stats count() by user.name',
      });
      const circuitBreaker = createMockCircuitBreaker(true);

      const mockRecords = [{ 'user.name': 'test', 'count()': 1 }];
      const mockToRecords = jest.fn().mockResolvedValue({ records: mockRecords });
      mockEsClient.helpers.esql.mockReturnValue({ toRecords: mockToRecords });

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
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
      const query = createMockQuery(QueryType.DSL);
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

      queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }).subscribe({
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
      const query = createMockQuery(QueryType.DSL);
      const circuitBreaker = createMockCircuitBreaker(true);

      setupPointInTime(mockEsClient);
      mockEsClient.ilm.explainLifecycle.mockResolvedValue({
        indices: { 'test-index-000001': { phase: 'hot' } },
      });
      mockEsClient.search.mockRejectedValue(new Error('Elasticsearch error'));

      queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }).subscribe({
        next: () => {},
        error: (error) => {
          expect(error.message).toBe('Elasticsearch error');
          done();
        },
        complete: () => done(new Error('Should not complete successfully')),
      });
    });

    test('should handle unsupported query type', () => {
      const query = createMockQuery('INVALID' as QueryType);
      const circuitBreaker = createMockCircuitBreaker(true);

      expect(() => {
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] });
      }).toThrow('Unhandled QueryType: INVALID');
    });

    test('should handle ILM explain lifecycle errors gracefully', (done) => {
      const query = createMockQuery(QueryType.DSL, { tiers: ['hot'] });
      const circuitBreaker = createMockCircuitBreaker(true);

      mockEsClient.ilm.explainLifecycle.mockResolvedValue({ indices: undefined });
      setupPointInTime(mockEsClient);
      mockEsClient.search.mockResolvedValue(createMockSearchResponse([]));

      executeObservableTest(
        queryExecutor.search({ query, circuitBreakers: [circuitBreaker] }),
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
});
