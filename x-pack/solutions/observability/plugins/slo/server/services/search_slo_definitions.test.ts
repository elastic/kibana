/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SearchSLODefinitions } from './search_slo_definitions';
import type { SLOSettings } from '../domain/models';
import { DEFAULT_SETTINGS } from './slo_settings_repository';

interface MockSummaryDocOptions {
  id?: string;
  name?: string;
  groupBy?: unknown;
  kibanaUrl?: string;
  remoteName?: string;
}

/**
 * Creates a mock Elasticsearch response with summary documents.
 * This helper generates realistic summary document structures for testing.
 */
function createMockSummaryDocResponse(docs: MockSummaryDocOptions[] = []): {
  aggregations: { slo_definitions: { buckets: any[]; after_key?: Record<string, unknown> } };
} {
  const buckets = docs.map((doc) => ({
    key: { slo_id: doc.id || 'slo-1' },
    slo_details: {
      hits: {
        hits: [
          {
            _source: {
              ...(doc.name !== undefined || doc.groupBy !== undefined
                ? {
                    slo: {
                      id: doc.id || 'slo-1',
                      ...(doc.name !== undefined && { name: doc.name }),
                      ...(doc.groupBy !== undefined && { groupBy: doc.groupBy }),
                    },
                  }
                : {}),
              ...(doc.kibanaUrl && { kibanaUrl: doc.kibanaUrl }),
            },
            fields: {
              remoteName: [doc.remoteName || 'local'],
            },
          },
        ],
      },
    },
  }));

  return {
    aggregations: {
      slo_definitions: {
        buckets,
      },
    },
  };
}

/**
 * Creates a mock Elasticsearch response with multiple summary documents and pagination info.
 */
function createMockSummaryDocResponseWithPagination(
  docs: MockSummaryDocOptions[] = [],
  afterKey?: Record<string, unknown>
): any {
  const response = createMockSummaryDocResponse(docs);
  if (afterKey) {
    response.aggregations.slo_definitions.after_key = afterKey;
  }
  return response;
}

describe('SearchSLODefinitions', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let searchSLODefinitions: SearchSLODefinitions;
  let mockSettings: SLOSettings;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggingSystemMock.createLogger();
    mockSettings = DEFAULT_SETTINGS;

    searchSLODefinitions = new SearchSLODefinitions(
      mockEsClient,
      mockLogger,
      'default',
      mockSettings
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    it('returns SLO definitions with basic structure', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
          groupBy: ['host'],
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.any(Array),
          size: 0,
          query: {
            bool: {
              filter: [{ term: { spaceId: 'default' } }],
            },
          },
        })
      );

      expect(result).toEqual({
        results: [
          {
            id: 'slo-1',
            name: 'Test SLO',
            groupBy: ['host'],
          },
        ],
        searchAfter: undefined,
      });
    });

    it('handles search query parameter', async () => {
      const mockResponse = createMockSummaryDocResponse();

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      await searchSLODefinitions.execute({ search: 'test query' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { term: { spaceId: 'default' } },
                {
                  simple_query_string: {
                    query: 'test query',
                    fields: ['slo.name^3', 'slo.description^2', 'slo.tags'],
                    default_operator: 'AND',
                    analyze_wildcard: true,
                  },
                },
              ],
            },
          },
        })
      );
    });

    it('handles size parameter', async () => {
      const mockResponse = createMockSummaryDocResponse();

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      await searchSLODefinitions.execute({ size: 50 });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: expect.objectContaining({
            slo_definitions: expect.objectContaining({
              composite: {
                size: 50,
                sources: [{ slo_id: { terms: { field: 'slo.id' } } }],
              },
            }),
          }),
        })
      );
    });

    it('throws error if size is less than 1', async () => {
      await expect(searchSLODefinitions.execute({ size: 0 })).rejects.toThrow(
        'Size must be between 1 and 100'
      );
      await expect(searchSLODefinitions.execute({ size: -5 })).rejects.toThrow(
        'Size must be between 1 and 100'
      );
    });

    it('throws error if size is greater than 100', async () => {
      await expect(searchSLODefinitions.execute({ size: 101 })).rejects.toThrow(
        'Size must be between 1 and 100'
      );
      await expect(searchSLODefinitions.execute({ size: 500 })).rejects.toThrow(
        'Size must be between 1 and 100'
      );
    });

    it('accepts size within valid range', async () => {
      const mockResponse = createMockSummaryDocResponse();
      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      await expect(searchSLODefinitions.execute({ size: 1 })).resolves.toBeDefined();
      await expect(searchSLODefinitions.execute({ size: 100 })).resolves.toBeDefined();
    });

    it('handles searchAfter pagination', async () => {
      const afterKey = { slo_id: 'slo-1' };
      const mockResponse = createMockSummaryDocResponseWithPagination(
        [
          {
            id: 'slo-2',
            name: 'Second SLO',
            groupBy: ALL_VALUE,
          },
        ],
        { slo_id: 'slo-2' }
      );

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({
        searchAfter: JSON.stringify(afterKey),
      });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: expect.objectContaining({
            slo_definitions: expect.objectContaining({
              composite: {
                size: 10,
                sources: [{ slo_id: { terms: { field: 'slo.id' } } }],
                after: afterKey,
              },
            }),
          }),
        })
      );

      expect(result.searchAfter).toBe(JSON.stringify({ slo_id: 'slo-2' }));
    });

    it('normalizes groupBy array correctly', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
          groupBy: ['host', 'datacenter'],
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].groupBy).toEqual(['host', 'datacenter']);
    });

    it('filters out ALL_VALUE from groupBy array', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
          groupBy: ['host', ALL_VALUE, 'datacenter'],
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].groupBy).toEqual(['host', 'datacenter']);
    });

    it('returns empty array when groupBy is ALL_VALUE', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
          groupBy: ALL_VALUE,
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].groupBy).toEqual([]);
    });

    it('handles remote cluster information', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Remote SLO',
          groupBy: ['host'],
          kibanaUrl: 'https://remote-kibana.example.com',
          remoteName: 'remote-cluster',
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0]).toEqual({
        id: 'slo-1',
        name: 'Remote SLO',
        groupBy: ['host'],
        remote: {
          remoteName: 'remote-cluster',
          kibanaUrl: 'https://remote-kibana.example.com',
        },
      });
    });

    it('handles local remoteName correctly', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Local SLO',
          groupBy: [],
          remoteName: 'local',
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].remote).toBeUndefined();
    });

    it('handles missing slo data gracefully', async () => {
      const mockResponse = {
        aggregations: {
          slo_definitions: {
            buckets: [
              {
                key: { slo_id: 'slo-1' },
                slo_details: {
                  hits: {
                    hits: [
                      {
                        _source: {},
                        fields: {
                          remoteName: ['local'],
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0]).toEqual({
        id: 'slo-1',
        name: '',
        groupBy: [],
      });
    });

    it('handles empty results', async () => {
      const mockResponse = createMockSummaryDocResponse();

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result).toEqual({
        results: [],
        searchAfter: undefined,
      });
    });

    it('handles missing aggregations', async () => {
      const mockResponse = {
        aggregations: undefined,
      };

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result).toEqual({
        results: [],
        searchAfter: undefined,
      });
    });
  });

  describe('error handling', () => {
    it('returns empty results on search error', async () => {
      const error = new Error('Elasticsearch error');
      mockEsClient.search.mockRejectedValueOnce(error);

      const result = await searchSLODefinitions.execute({});

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error searching SLO Definitions: Error: Elasticsearch error'
      );
      expect(result).toEqual({ results: [] });
    });

    it('handles invalid searchAfter JSON gracefully', async () => {
      const mockResponse = createMockSummaryDocResponse();

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({
        searchAfter: 'invalid-json',
      });

      // Verify that 'after' is not present in the composite aggregation when JSON is invalid
      const searchCall = mockEsClient.search.mock.calls[0][0] as any;
      expect(searchCall.aggs.slo_definitions.composite.after).toBeUndefined();
      expect(searchCall.aggs.slo_definitions.composite.size).toBe(10);
      expect(searchCall.aggs.slo_definitions.composite.sources).toEqual([
        { slo_id: { terms: { field: 'slo.id' } } },
      ]);

      expect(result.results).toEqual([]);
    });

    it('handles array remoteName field', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
          groupBy: [],
          remoteName: 'remote-cluster',
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].remote?.remoteName).toBe('remote-cluster');
    });
  });

  describe('groupBy normalization', () => {
    it('handles string groupBy', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
          groupBy: 'host',
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].groupBy).toEqual(['host']);
    });

    it('handles null groupBy', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
          groupBy: null,
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].groupBy).toEqual([]);
    });

    it('handles undefined groupBy', async () => {
      const mockResponse = createMockSummaryDocResponse([
        {
          id: 'slo-1',
          name: 'Test SLO',
        },
      ]);

      mockEsClient.search.mockResolvedValueOnce(mockResponse as any);

      const result = await searchSLODefinitions.execute({});

      expect(result.results[0].groupBy).toEqual([]);
    });
  });
});
