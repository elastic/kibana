/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadSourceReportStatsByName } from './list_sources';

describe('loadSourceReportStatsByName', () => {
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

  it('returns report counts keyed by source name', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: {
          by_source_name: {
            buckets: [
              {
                key: 'ti-rss-okta',
                doc_count: 3,
                last_ingested: { value_as_string: '2026-07-22T12:00:00.000Z' },
                env_hits: { value: 5 },
              },
            ],
          },
        },
      }),
    };

    const stats = await loadSourceReportStatsByName({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.get('ti-rss-okta')).toEqual({
      report_count: 3,
      last_ingested_at: '2026-07-22T12:00:00.000Z',
      env_hits_total: 5,
    });
  });

  it('applies Hub time_range to the report enrichment query', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: { by_source_name: { buckets: [] } },
      }),
    };

    await loadSourceReportStatsByName({
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

    const stats = await loadSourceReportStatsByName({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.size).toBe(0);
  });
});
