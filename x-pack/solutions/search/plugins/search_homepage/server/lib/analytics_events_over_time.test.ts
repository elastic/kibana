/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { IncompleteClusterStateError } from './analytics_cluster_state';
import {
  EVENTS_LOOKBACK_MS,
  fetchAnalyticsEventsOverTime,
  pickIntervalMs,
} from './analytics_events_over_time';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
// A multiple of every interval, so bucket starts are easy to read.
const NOW = 20_000 * DAY_MS;

interface SearchParams {
  index: string[];
  query: { range: Record<string, { gte: number; lte: number }> };
  aggs: {
    earliest?: { min: { field: string } };
    overTime?: { date_histogram: { field: string; fixed_interval: string } };
  };
}

describe('pickIntervalMs', () => {
  it.each([
    [30 * MINUTE_MS, MINUTE_MS],
    [HOUR_MS, MINUTE_MS],
    [3 * HOUR_MS, 5 * MINUTE_MS],
    [DAY_MS, 30 * MINUTE_MS],
    [5 * DAY_MS, 3 * HOUR_MS],
    [30 * DAY_MS, 12 * HOUR_MS],
    [90 * DAY_MS, 12 * HOUR_MS],
  ])('covers a window of %d ms with buckets of %d ms', (windowMs, intervalMs) => {
    expect(pickIntervalMs(windowMs)).toBe(intervalMs);
  });
});

describe('fetchAnalyticsEventsOverTime', () => {
  const setup = ({
    earliestByField,
    countsByField = {},
    failedShards = 0,
  }: {
    earliestByField: Record<string, number | null>;
    countsByField?: Record<string, Record<number, number>>;
    failedShards?: number;
  }) => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    const searches: SearchParams[] = [];
    client.asCurrentUser.search.mockImplementation((async (params: SearchParams) => {
      searches.push(params);
      const [field] = Object.keys(params.query.range);
      return {
        took: 1,
        timed_out: false,
        _shards: { total: 2, successful: 2 - failedShards, failed: failedShards },
        hits: { hits: [] },
        aggregations: params.aggs.earliest
          ? { earliest: { value: earliestByField[field] } }
          : {
              overTime: {
                buckets: Object.entries(countsByField[field] ?? {}).map(([key, count]) => ({
                  key: Number(key),
                  doc_count: count,
                })),
              },
            },
      };
    }) as never);

    return { client, searches };
  };

  it('buckets from the first recent event until now, as the current user', async () => {
    const earliest = NOW - 2 * HOUR_MS;
    const { client, searches } = setup({
      earliestByField: { '@timestamp': earliest },
      countsByField: { '@timestamp': { [earliest]: 4, [NOW - 5 * MINUTE_MS]: 6 } },
    });

    const result = await fetchAnalyticsEventsOverTime({
      client,
      sources: [{ name: 'clicks', timeField: '@timestamp' }],
      now: NOW,
    });

    expect(client.asInternalUser.search).not.toHaveBeenCalled();
    expect(searches[0]).toMatchObject({
      index: ['clicks'],
      ignore_unavailable: true,
      size: 0,
      query: { range: { '@timestamp': { gte: NOW - EVENTS_LOOKBACK_MS, lte: NOW } } },
    });
    expect(searches[1].aggs.overTime?.date_histogram).toMatchObject({
      field: '@timestamp',
      fixed_interval: `${5 * MINUTE_MS}ms`,
    });
    expect(result).toMatchObject({
      from: earliest,
      to: NOW,
      intervalMs: 5 * MINUTE_MS,
      total: 10,
    });
    expect(result.buckets).toHaveLength(25);
    expect(result.buckets[0]).toEqual({ timestamp: earliest, count: 4 });
    expect(result.buckets[1]).toEqual({ timestamp: earliest + 5 * MINUTE_MS, count: 0 });
    expect(result.buckets[23]).toEqual({ timestamp: NOW - 5 * MINUTE_MS, count: 6 });
  });

  it('adds up sources that keep their event time in different fields', async () => {
    const earliest = NOW - 10 * DAY_MS;
    const { client, searches } = setup({
      earliestByField: { '@timestamp': NOW - DAY_MS, order_date: earliest },
      countsByField: {
        '@timestamp': { [NOW - 12 * HOUR_MS]: 5 },
        order_date: { [earliest]: 2, [NOW - 12 * HOUR_MS]: 3 },
      },
    });

    const result = await fetchAnalyticsEventsOverTime({
      client,
      sources: [
        { name: 'clicks', timeField: '@timestamp' },
        { name: 'views', timeField: '@timestamp' },
        { name: 'orders', timeField: 'order_date' },
      ],
      now: NOW,
    });

    expect(searches.map(({ index }) => index)).toEqual([
      ['clicks', 'views'],
      ['orders'],
      ['clicks', 'views'],
      ['orders'],
    ]);
    expect(result.intervalMs).toBe(12 * HOUR_MS);
    expect(result.total).toBe(10);
    expect(result.buckets[0]).toEqual({ timestamp: earliest, count: 2 });
    expect(result.buckets.find(({ timestamp }) => timestamp === NOW - 12 * HOUR_MS)?.count).toBe(8);
  });

  it('widens the window of a stream that has only just started', async () => {
    const { client } = setup({ earliestByField: { '@timestamp': NOW - 2 * MINUTE_MS } });

    const result = await fetchAnalyticsEventsOverTime({
      client,
      sources: [{ name: 'clicks', timeField: '@timestamp' }],
      now: NOW,
    });

    expect(result.from).toBe(NOW - 30 * MINUTE_MS);
    expect(result.intervalMs).toBe(MINUTE_MS);
  });

  it('returns no buckets, after one search, when there are no recent events', async () => {
    const { client, searches } = setup({ earliestByField: { '@timestamp': null } });

    const result = await fetchAnalyticsEventsOverTime({
      client,
      sources: [{ name: 'clicks', timeField: '@timestamp' }],
      now: NOW,
    });

    expect(searches).toHaveLength(1);
    expect(result).toMatchObject({ total: 0, buckets: [] });
  });

  it('fails rather than undercount when shards fail', async () => {
    const { client } = setup({ earliestByField: { '@timestamp': NOW }, failedShards: 1 });

    await expect(
      fetchAnalyticsEventsOverTime({
        client,
        sources: [{ name: 'clicks', timeField: '@timestamp' }],
        now: NOW,
      })
    ).rejects.toBeInstanceOf(IncompleteClusterStateError);
  });

  it('passes on an Elasticsearch failure', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    const error = Object.assign(new Error('unauthorized'), { statusCode: 403 });
    client.asCurrentUser.search.mockRejectedValue(error);

    await expect(
      fetchAnalyticsEventsOverTime({
        client,
        sources: [{ name: 'clicks', timeField: '@timestamp' }],
        now: NOW,
      })
    ).rejects.toBe(error);
  });
});
