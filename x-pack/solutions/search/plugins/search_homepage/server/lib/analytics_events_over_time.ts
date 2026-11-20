/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsDateHistogramAggregate,
  AggregationsMinAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  AnalyticsEventsOverTime,
  AnalyticsEventsOverTimeSource,
} from '../../common/analytics';
import { IncompleteClusterStateError } from './analytics_cluster_state';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const EVENTS_LOOKBACK_MS = 30 * DAY_MS;
/** A stream that started moments ago still gets a time axis wide enough to read. */
const MIN_WINDOW_MS = 30 * MINUTE_MS;
const MAX_BUCKETS = 60;
const INTERVALS_MS: readonly number[] = [
  MINUTE_MS,
  5 * MINUTE_MS,
  30 * MINUTE_MS,
  3 * HOUR_MS,
  12 * HOUR_MS,
];
const LARGEST_INTERVAL_MS = 12 * HOUR_MS;

/** The smallest interval that covers the window in at most `MAX_BUCKETS` buckets. */
export const pickIntervalMs = (windowMs: number): number =>
  INTERVALS_MS.find((intervalMs) => windowMs / intervalMs <= MAX_BUCKETS) ?? LARGEST_INTERVAL_MS;

const groupByTimeField = (
  sources: readonly AnalyticsEventsOverTimeSource[]
): Array<[timeField: string, names: string[]]> => {
  const groups = new Map<string, string[]>();
  for (const { name, timeField } of sources) {
    groups.set(timeField, [...(groups.get(timeField) ?? []), name]);
  }
  return [...groups];
};

const timeRange = (timeField: string, from: number, to: number): QueryDslQueryContainer => ({
  range: { [timeField]: { gte: from, lte: to, format: 'epoch_millis' } },
});

/** One search per time field, in parallel; a failure of any of them fails the whole read. */
const searchGroups = <TAggregations>(
  client: IScopedClusterClient,
  groups: ReadonlyArray<[timeField: string, names: string[]]>,
  buildSearch: (timeField: string) => {
    query: QueryDslQueryContainer;
    aggs: Record<string, AggregationsAggregationContainer>;
  }
): Promise<Array<TAggregations | undefined>> =>
  Promise.all(
    groups.map(async ([timeField, names]) => {
      const { _shards: shards, aggregations } = await client.asCurrentUser.search<
        never,
        TAggregations
      >({
        index: names,
        // A source deleted since the cluster state was read counts as holding no events.
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        track_total_hits: false,
        ...buildSearch(timeField),
      });
      if (shards.failed > 0) {
        throw new IncompleteClusterStateError(shards.failed, shards.total);
      }
      return aggregations;
    })
  );

/**
 * Event counts over time for the given sources, read as the caller. The period runs from the
 * first event of the last 30 days until now, so a stream that started an hour ago and one that has
 * run for months both fill the chart; sources bucketed on different date fields are added up.
 */
export const fetchAnalyticsEventsOverTime = async ({
  client,
  sources,
  now = Date.now(),
}: {
  client: IScopedClusterClient;
  sources: readonly AnalyticsEventsOverTimeSource[];
  now?: number;
}): Promise<AnalyticsEventsOverTime> => {
  const groups = groupByTimeField(sources);
  const lookbackStart = now - EVENTS_LOOKBACK_MS;

  const earliestEvents = await searchGroups<{ earliest: AggregationsMinAggregate }>(
    client,
    groups,
    (timeField) => ({
      query: timeRange(timeField, lookbackStart, now),
      aggs: { earliest: { min: { field: timeField } } },
    })
  );
  const earliestTimestamps = earliestEvents.flatMap((aggregations) => {
    const value = aggregations?.earliest.value;
    return typeof value === 'number' ? [value] : [];
  });

  if (earliestTimestamps.length === 0) {
    return {
      from: lookbackStart,
      to: now,
      intervalMs: LARGEST_INTERVAL_MS,
      total: 0,
      buckets: [],
    };
  }

  const windowMs = Math.max(now - Math.min(...earliestTimestamps), MIN_WINDOW_MS);
  const intervalMs = pickIntervalMs(windowMs);
  // Elasticsearch aligns fixed-interval buckets to the epoch, so the same rounding lines them up.
  const from = Math.floor((now - windowMs) / intervalMs) * intervalMs;

  const histograms = await searchGroups<{ overTime: AggregationsDateHistogramAggregate }>(
    client,
    groups,
    (timeField) => ({
      query: timeRange(timeField, from, now),
      aggs: {
        overTime: {
          date_histogram: { field: timeField, fixed_interval: `${intervalMs}ms`, min_doc_count: 1 },
        },
      },
    })
  );

  const countsByTimestamp = new Map<number, number>();
  for (const aggregations of histograms) {
    const buckets = aggregations?.overTime.buckets ?? [];
    for (const { key, doc_count: count } of Array.isArray(buckets)
      ? buckets
      : Object.values(buckets)) {
      countsByTimestamp.set(key, (countsByTimestamp.get(key) ?? 0) + count);
    }
  }

  const buckets = [];
  let total = 0;
  for (let timestamp = from; timestamp <= now; timestamp += intervalMs) {
    const count = countsByTimestamp.get(timestamp) ?? 0;
    total += count;
    buckets.push({ timestamp, count });
  }

  return { from, to: now, intervalMs, total, buckets };
};
