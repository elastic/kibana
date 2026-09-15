/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SemanticLogSearchService } from '@kbn/logs-data-access-plugin/server';
import { getLogsHandler } from './handler';

// Mock the dependencies
jest.mock('../../utils/dsl_filters', () => ({
  timeRangeFilter: jest.fn(() => [{ range: { '@timestamp': { gte: 0, lte: 1000 } } }]),
  kqlFilter: jest.fn((filter) => (filter ? [{ query_string: { query: filter } }] : [])),
}));

const mockSearchFn = jest.fn().mockResolvedValue({
  hits: { hits: [], total: { value: 0 } },
  aggregations: {
    histogram: { buckets: [] },
    sampler: {
      logCategories: { patterns: { buckets: [] } },
      exceptionCategories: { patterns: { buckets: [] } },
    },
  },
});

jest.mock('../../utils/get_typed_search', () => ({
  getTypedSearch: jest.fn(() => mockSearchFn),
}));

jest.mock('../../utils/get_total_hits', () => ({
  getTotalHits: jest.fn(() => 0),
}));

describe('getLogsHandler', () => {
  const mockEsClient = {} as ElasticsearchClient;

  const baseParams = {
    start: 'now-1h',
    end: 'now',
    index: 'logs-*',
    limit: 10,
    bucketSize: '1m',
    fields: ['message', '@timestamp'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('semantic filter', () => {
    it('should call semanticLogSearch when semanticFilter is provided', async () => {
      const mockSemanticLogSearch: SemanticLogSearchService = {
        search: jest.fn().mockResolvedValue({
          patterns: [
            {
              field: 'message',
              pattern: 'Connection to * failed',
              count: 100,
              firstSeen: '2024-01-01T00:00:00Z',
              lastSeen: '2024-01-01T01:00:00Z',
              sample: {
                _id: 'doc1',
                _index: 'logs-test',
                message: 'Connection to db-server failed after 30s timeout',
              },
            },
          ],
        }),
        expand: jest.fn(),
      };

      await getLogsHandler({
        esClient: mockEsClient,
        params: {
          ...baseParams,
          semanticFilter: 'connection failures',
        },
        semanticLogSearch: mockSemanticLogSearch,
      });

      expect(mockSemanticLogSearch.search).toHaveBeenCalledWith({
        esClient: mockEsClient,
        target: 'logs-*',
        nlQuery: 'connection failures',
        timeRange: expect.any(Object),
        maxPatterns: 10,
      });
    });

    it('should not call semanticLogSearch when semanticFilter is not provided', async () => {
      const mockSemanticLogSearch: SemanticLogSearchService = {
        search: jest.fn(),
        expand: jest.fn(),
      };

      await getLogsHandler({
        esClient: mockEsClient,
        params: baseParams,
        semanticLogSearch: mockSemanticLogSearch,
      });

      expect(mockSemanticLogSearch.search).not.toHaveBeenCalled();
    });

    it('should add semantic pattern filter as DSL to baseFilter', async () => {
      const mockSemanticLogSearch: SemanticLogSearchService = {
        search: jest.fn().mockResolvedValue({
          patterns: [
            {
              field: 'message',
              pattern: 'Error connecting',
              count: 50,
              firstSeen: '2024-01-01T00:00:00Z',
              lastSeen: '2024-01-01T01:00:00Z',
              sample: {
                _id: 'doc1',
                _index: 'logs-test',
                message: 'Error connecting to database',
              },
            },
          ],
        }),
        expand: jest.fn(),
      };

      await getLogsHandler({
        esClient: mockEsClient,
        params: {
          ...baseParams,
          semanticFilter: 'database errors',
        },
        semanticLogSearch: mockSemanticLogSearch,
      });

      // The search should be called with DSL that includes the semantic pattern filter
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                // Semantic pattern filter as DSL with match_phrase
                {
                  bool: {
                    should: [{ match_phrase: { message: 'Error connecting to database' } }],
                    minimum_should_match: 1,
                  },
                },
              ]),
            },
          },
        })
      );
    });

    it('should combine kqlFilter and semantic pattern filter in baseFilter', async () => {
      const { kqlFilter } = jest.requireMock('../../utils/dsl_filters');

      const mockSemanticLogSearch: SemanticLogSearchService = {
        search: jest.fn().mockResolvedValue({
          patterns: [
            {
              field: 'message',
              pattern: 'Error connecting',
              count: 50,
              firstSeen: '2024-01-01T00:00:00Z',
              lastSeen: '2024-01-01T01:00:00Z',
              sample: {
                _id: 'doc1',
                _index: 'logs-test',
                message: 'Error connecting to database',
              },
            },
          ],
        }),
        expand: jest.fn(),
      };

      await getLogsHandler({
        esClient: mockEsClient,
        params: {
          ...baseParams,
          kqlFilter: 'service.name: "my-service"',
          semanticFilter: 'database errors',
        },
        semanticLogSearch: mockSemanticLogSearch,
      });

      // kqlFilter should be called with only the user's filter (not combined)
      expect(kqlFilter).toHaveBeenCalledWith('service.name: "my-service"');

      // Both filters should be in baseFilter array
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                // User's KQL filter converted to DSL
                { query_string: { query: 'service.name: "my-service"' } },
                // Semantic pattern filter as DSL
                {
                  bool: {
                    should: [{ match_phrase: { message: 'Error connecting to database' } }],
                    minimum_should_match: 1,
                  },
                },
              ]),
            },
          },
        })
      );
    });

    it('should handle empty patterns from semantic search', async () => {
      const { kqlFilter } = jest.requireMock('../../utils/dsl_filters');

      const mockSemanticLogSearch: SemanticLogSearchService = {
        search: jest.fn().mockResolvedValue({
          patterns: [],
        }),
        expand: jest.fn(),
      };

      await getLogsHandler({
        esClient: mockEsClient,
        params: {
          ...baseParams,
          kqlFilter: 'service.name: "my-service"',
          semanticFilter: 'nonexistent pattern',
        },
        semanticLogSearch: mockSemanticLogSearch,
      });

      // Should use original kqlFilter when no patterns found
      expect(kqlFilter).toHaveBeenCalledWith('service.name: "my-service"');

      // baseFilter should NOT contain semantic pattern filter (empty array spread)
      const searchCall = mockSearchFn.mock.calls[0][0];
      const hasSemanticFilter = searchCall.query.bool.filter.some(
        (f: Record<string, unknown>) =>
          f.bool && (f.bool as Record<string, unknown>).should !== undefined
      );
      expect(hasSemanticFilter).toBe(false);
    });

    it('should handle multiple patterns with match_phrase for each', async () => {
      const mockSemanticLogSearch: SemanticLogSearchService = {
        search: jest.fn().mockResolvedValue({
          patterns: [
            {
              field: 'message',
              pattern: 'Connection failed',
              count: 100,
              firstSeen: '2024-01-01T00:00:00Z',
              lastSeen: '2024-01-01T01:00:00Z',
              sample: { message: 'Connection failed to db-server' },
            },
            {
              field: 'message',
              pattern: 'Timeout error',
              count: 50,
              firstSeen: '2024-01-01T00:00:00Z',
              lastSeen: '2024-01-01T01:00:00Z',
              sample: { message: 'Timeout error after 30 seconds' },
            },
          ],
        }),
        expand: jest.fn(),
      };

      await getLogsHandler({
        esClient: mockEsClient,
        params: {
          ...baseParams,
          semanticFilter: 'connection issues',
        },
        semanticLogSearch: mockSemanticLogSearch,
      });

      // Should have both patterns in the should clause
      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                {
                  bool: {
                    should: [
                      { match_phrase: { message: 'Connection failed to db-server' } },
                      { match_phrase: { message: 'Timeout error after 30 seconds' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ]),
            },
          },
        })
      );
    });
  });
});
