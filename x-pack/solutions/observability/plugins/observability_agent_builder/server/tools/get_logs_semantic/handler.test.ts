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
      status: 'success',
      patterns: rankedPatterns,
    });
    const semanticLogSearch = { search } as SemanticLogSearchService;

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
      warnings: [],
    });
  });

  it('passes kqlFilter and maxPatterns through to the service', async () => {
    const search = jest.fn().mockResolvedValue({ status: 'success', patterns: [] });
    const semanticLogSearch = { search } as SemanticLogSearchService;

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
      status: 'success',
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
    });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search } as SemanticLogSearchService,
    });

    expect(result.patterns[0].sample.message).toBe(`${'x'.repeat(500)}...`);
  });

  it('bounds nested sample values', async () => {
    const search = jest.fn().mockResolvedValue({
      status: 'success',
      patterns: [
        {
          ...rankedPatterns[0],
          sample: {
            nested: {
              level1: {
                level2: {
                  level3: {
                    level4: 'hidden',
                  },
                },
              },
            },
            items: Array.from({ length: 25 }, (_, index) => `item-${index}`),
          },
        },
      ],
    });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search } as SemanticLogSearchService,
    });

    expect(result.patterns[0].sample.nested).toEqual({
      level1: { level2: { level3: '[truncated]' } },
    });
    expect(result.patterns[0].sample.items).toHaveLength(20);
  });

  it.each([
    ['missing_fields', 'target does not expose the required message and @timestamp fields'],
    ['inference_unavailable', 'cluster has no RERANK inference endpoint'],
  ] as const)('returns an actionable unavailable warning for %s', async (reason, warning) => {
    const search = jest.fn().mockResolvedValue({ status: 'unavailable', reason });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search } as SemanticLogSearchService,
    });

    expect(result.patterns).toEqual([]);
    expect(result.warnings[0]).toContain(warning);
    expect(result.warnings[0]).toContain('Do not retry');
  });

  it('returns an unavailable warning when the service is missing', async () => {
    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
    });

    expect(result.patterns).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('not registered');
  });

  it('does not call the service when the target is empty', async () => {
    const search = jest.fn();

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: { ...baseParams, index: '' },
      semanticLogSearch: { search } as SemanticLogSearchService,
    });

    expect(search).not.toHaveBeenCalled();
    expect(result.warnings[0]).toContain('No log indices');
  });

  it('warns when no patterns match and limits retries', async () => {
    const search = jest.fn().mockResolvedValue({ status: 'success', patterns: [] });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search } as SemanticLogSearchService,
    });

    expect(result.patterns).toEqual([]);
    expect(result.warnings[0]).toContain('retry once');
  });

  it.each([
    ['timeout', 'Narrow the time range or add a KQL filter before retrying once'],
    ['cancelled', 'Do not retry automatically'],
    ['execution', 'Do not retry automatically or fall back silently'],
  ] as const)('maps %s errors to actionable warnings', async (reason, warning) => {
    const search = jest.fn().mockResolvedValue({ status: 'error', reason });

    const result = await getLogsSemanticHandler({
      esClient: mockEsClient,
      params: baseParams,
      semanticLogSearch: { search } as SemanticLogSearchService,
    });

    expect(result.patterns).toEqual([]);
    expect(result.warnings[0]).toContain(warning);
  });

  it('rejects an invalid date range before calling the service', async () => {
    const search = jest.fn();

    await expect(
      getLogsSemanticHandler({
        esClient: mockEsClient,
        params: { ...baseParams, start: '' },
        semanticLogSearch: { search } as SemanticLogSearchService,
      })
    ).rejects.toThrow('Invalid date range');
    expect(search).not.toHaveBeenCalled();
  });
});
