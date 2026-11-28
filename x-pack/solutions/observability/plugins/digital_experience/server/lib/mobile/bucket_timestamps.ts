/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, sortBy, sortedUniq } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from '../../../common/otel_data';
import type { HistogramInterval } from '../../../common/types/applications';
import { dateHistogram } from '../helpers/time_series';

/**
 * Every bucket of the range, empty ones included: TBUCKET leaves out the empty ones, and a date
 * histogram aligned the same way has them all.
 */
export const getBucketTimestamps = async ({
  esClient,
  operationName,
  start,
  end,
  interval,
  timeZone,
}: {
  esClient: TracedElasticsearchClient;
  operationName: string;
  start: number;
  end: number;
  interval: HistogramInterval;
  timeZone: string;
}): Promise<number[]> => {
  const { aggregations } = await esClient.search(operationName, {
    index: [OTEL_TRACES_INDEX, OTEL_LOGS_INDEX],
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    track_total_hits: false,
    query: { match_none: {} },
    aggs: {
      buckets: dateHistogram({
        start,
        // `extended_bounds` includes its max, the range doesn't
        end: end - 1,
        histogram: { interval, timeZone },
      }),
    },
  });
  return aggregations?.buckets.buckets.map(({ key }) => key) ?? [];
};

/** Every bucket of the range and of the points, sorted, so a chart never draws across an empty one. */
export const allBucketTimestamps = (
  bucketTimestamps: readonly number[],
  pointTimestamps: readonly number[]
): number[] => sortedUniq(sortBy([...bucketTimestamps, ...pointTimestamps]));

/** A point per timestamp: the series' own, or `emptyPoint` where it has none. */
export const fillBuckets = <TPoint extends { timestamp: number }>(
  points: readonly TPoint[],
  timestamps: readonly number[],
  emptyPoint: (timestamp: number) => TPoint
): TPoint[] => {
  const byTimestamp = keyBy(points, 'timestamp');
  return timestamps.map((timestamp) => byTimestamp[timestamp] ?? emptyPoint(timestamp));
};
