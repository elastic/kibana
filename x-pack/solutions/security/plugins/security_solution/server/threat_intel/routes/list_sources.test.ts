/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadSourceReportStatsByAdapterId } from './list_sources';

describe('loadSourceReportStatsByAdapterId', () => {
  const logger = {
    warn: jest.fn(),
  };

  const defaultArgs = {
    spaceId: 'default',
    logger: logger as never,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns report counts keyed by adapter id', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: {
          by_adapter_id: {
            buckets: [
              {
                key: 'rss:ti-rss-okta',
                doc_count: 3,
                last_ingested: { value_as_string: '2026-07-22T12:00:00.000Z' },
                env_hits: { value: 5 },
              },
            ],
          },
        },
      }),
    };

    const stats = await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.get('rss:ti-rss-okta')).toEqual({
      report_count: 3,
      last_ingested_at: '2026-07-22T12:00:00.000Z',
      env_hits_total: 5,
    });
  });

  // Aggregating on source.name merged rows whenever two sources shared a
  // display name — the create API allows duplicates, and a space-private source
  // can share a name with a global one.
  it('keeps two sources that share a display name separate', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: {
          by_adapter_id: {
            buckets: [
              { key: 'rss:private-copy', doc_count: 2, env_hits: { value: 1 } },
              { key: 'rss:global-copy', doc_count: 7, env_hits: { value: 4 } },
            ],
          },
        },
      }),
    };

    const stats = await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.get('rss:private-copy')?.report_count).toBe(2);
    expect(stats.get('rss:global-copy')?.report_count).toBe(7);
  });

  it('aggregates on the stable adapter id rather than the mutable name', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: { by_adapter_id: { buckets: [] } },
      }),
    };

    await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: expect.objectContaining({
          by_adapter_id: expect.objectContaining({
            terms: expect.objectContaining({ field: 'source.adapter_id' }),
          }),
        }),
      })
    );
  });

  it('applies time_range to the report enrichment query', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: { by_adapter_id: { buckets: [] } },
      }),
    };

    await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
      timeRange: { from: '2026-07-16T00:00:00.000Z', to: '2026-07-23T00:00:00.000Z' },
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([
              {
                range: {
                  '@timestamp': {
                    gte: '2026-07-16T00:00:00.000Z',
                    lte: '2026-07-23T00:00:00.000Z',
                  },
                },
              },
            ]),
          },
        },
      })
    );
  });

  it('returns an empty map when enrichment search fails', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue(new Error('index missing')),
    };

    const stats = await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.size).toBe(0);
  });
});
