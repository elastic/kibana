/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SemanticLogSearchService } from '@kbn/logs-data-access-plugin/server';
import { getLogsSemanticHandler } from './handler';

describe('getLogsSemanticHandler', () => {
  const mockEsClient = {} as ElasticsearchClient;

  const baseParams = {
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
    index: 'logs-*',
    semanticFilter: 'connection failures',
    maxPatterns: 10,
  };

  const rankedPatterns = [
    {
      field: 'message',
      pattern: 'Connection to timed out',
      count: 100,
      firstSeen: '2024-01-01T00:00:00.000Z',
      lastSeen: '2024-01-01T00:50:00.000Z',
      sample: {
        _id: 'doc1',
        _index: 'logs-test',
        message: 'Connection to db-server timed out',
      },
    },
    {
      field: 'message',
      pattern: 'Failed to connect',
      count: 40,
      firstSeen: '2024-01-01T00:10:00.000Z',
      lastSeen: '2024-01-01T00:40:00.000Z',
      sample: { message: 'Failed to connect to replica' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps ranked patterns and sums their counts without querying Elasticsearch', async () => {
    const search = jest.fn().mockResolvedValue({
      patterns: rankedPatterns,
      strategy: 'esql_rerank',
    });
    const semanticLogSearch = { search, expand: jest.fn() } as unknown as SemanticLogSearchService;

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch,
    });

    expect(search).toHaveBeenCalledWith({
      esClient: mockEsClient,
      target: 'logs-*',
      nlQuery: 'connection failures',
      timeRange: { start: expect.any(Number), end: expect.any(Number) },
      maxPatterns: 10,
      kqlFilter: undefined,
    });

    expect(result).toEqual({
      patterns: [
        {
          pattern: 'Connection to timed out',
          count: 100,
          firstSeen: '2024-01-01T00:00:00.000Z',
          lastSeen: '2024-01-01T00:50:00.000Z',
          sample: {
            _id: 'doc1',
            _index: 'logs-test',
            message: 'Connection to db-server timed out',
          },
        },
        {
          pattern: 'Failed to connect',
          count: 40,
          firstSeen: '2024-01-01T00:10:00.000Z',
          lastSeen: '2024-01-01T00:40:00.000Z',
          sample: { message: 'Failed to connect to replica' },
        },
      ],
      totalCount: 140,
      semanticQuery: 'connection failures',
      strategy: 'esql_rerank',
      warnings: [],
    });
  });

  it('passes kqlFilter and maxPatterns through to the service', async () => {
    const search = jest.fn().mockResolvedValue({ patterns: [], strategy: 'esql_rerank' });
    const semanticLogSearch = { search, expand: jest.fn() } as unknown as SemanticLogSearchService;

    await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: {
        ...baseParams,
        kqlFilter: 'service.name: checkout',
        maxPatterns: 25,
      },
      semanticLogSearch,
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        kqlFilter: 'service.name: checkout',
        maxPatterns: 25,
      })
    );
  });

  it('truncates long sample field values', async () => {
    const search = jest.fn().mockResolvedValue({
      patterns: [
        {
          field: 'message',
          pattern: 'Long message',
          count: 1,
          firstSeen: '2024-01-01T00:00:00.000Z',
          lastSeen: '2024-01-01T00:00:00.000Z',
          sample: { message: 'x'.repeat(520) },
        },
      ],
      strategy: 'esql_rerank',
    });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search, expand: jest.fn() } as unknown as SemanticLogSearchService,
    });

    expect(result.patterns[0].sample.message).toBe(`${'x'.repeat(500)}...`);
  });

  it('returns an unavailable warning when the service cannot run', async () => {
    const search = jest.fn().mockResolvedValue({ patterns: [], unavailable: true });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search, expand: jest.fn() } as unknown as SemanticLogSearchService,
    });

    expect(result).toEqual({
      patterns: [],
      totalCount: 0,
      semanticQuery: 'connection failures',
      warnings: [
        'Semantic log search is not available for this index. The cluster has no RERANK inference endpoint.',
      ],
    });
  });

  it('returns an unavailable warning when the service is missing', async () => {
    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
    });

    expect(result.patterns).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('not available');
  });

  it('warns when no patterns match, without switching tools', async () => {
    const search = jest.fn().mockResolvedValue({ patterns: [], strategy: 'esql_rerank' });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search, expand: jest.fn() } as unknown as SemanticLogSearchService,
    });

    expect(result).toEqual({
      patterns: [],
      totalCount: 0,
      semanticQuery: 'connection failures',
      strategy: 'esql_rerank',
      warnings: [
        'No matching log patterns in this time range. Widen the range and keep this tool; do not switch to observability.get_logs.',
      ],
    });
  });
});
