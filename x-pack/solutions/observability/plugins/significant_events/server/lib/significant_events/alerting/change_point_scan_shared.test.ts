/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
  buildChangePointHistogramWindow,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';

describe('buildChangePointHistogramWindow', () => {
  it('ends at now-MAX_WRITE_DELAY and extends min by the same write delay', () => {
    // Critical profile: 40m duration ending at now-7m → source min now-47m.
    expect(buildChangePointHistogramWindow('now-40m', '1m')).toEqual({
      hardBounds: { min: 'now-47m', max: 'now-7m' },
      seriesMax: 'now-8m',
      writeTimeLookback: 'now-48m',
    });
    // Default profile: 125m duration, 5m buckets.
    expect(buildChangePointHistogramWindow('now-125m', '5m')).toEqual({
      hardBounds: { min: 'now-132m', max: 'now-7m' },
      seriesMax: 'now-12m',
      writeTimeLookback: 'now-137m',
    });
  });

  it('keeps seriesMax one interval below the exclusive hard_bounds.max', () => {
    // `hard_bounds.max` is exclusive but `extended_bounds.max` emits a bucket at
    // its own value, so sharing one instant would fabricate an unfillable
    // newest bucket. The gap must be exactly one interval: any wider and the
    // series loses a real, fully-written bucket.
    for (const bucketMinutes of [1, 5, 10]) {
      const { hardBounds, seriesMax } = buildChangePointHistogramWindow(
        'now-40m',
        `${bucketMinutes}m`
      );
      expect(hardBounds.max).toBe('now-7m');
      expect(seriesMax).toBe(`now-${7 + bucketMinutes}m`);
    }
  });

  it('widens the write-time prune past the interval-rounded lower edge', () => {
    // ES rounds `hard_bounds.min` down to the interval grid, so the window can
    // start up to `interval - 1m` earlier than requested. The prune has to cover
    // those minutes or the oldest bucket reads as a partial sum.
    const { hardBounds, writeTimeLookback } = buildChangePointHistogramWindow('now-125m', '5m');
    const minMinutes = Number(String(hardBounds.min).match(/now-(\d+)m/)![1]);
    const pruneMinutes = Number(writeTimeLookback.match(/now-(\d+)m/)![1]);
    expect(pruneMinutes - minMinutes).toBe(5);
  });
});

describe('buildChangePointTimeSeriesAggs', () => {
  it('deduplicates at 1m with MAX then SUM into the configured outer interval', () => {
    const { hardBounds, seriesMax } = buildChangePointHistogramWindow('now-125m', '5m');
    const aggs = buildChangePointTimeSeriesAggs({
      bucketInterval: '5m',
      hardBounds,
      seriesMax,
    });

    expect(METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL).toBe('1m');
    expect(aggs.over_time).toEqual({
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: '5m',
        min_doc_count: 0,
        // Upper edge only. Pinning `max` keeps the trailing zeros of a rule
        // that went silent; leaving `min` open starts the series at the rule's
        // first observed bucket instead of fabricating history back to the
        // window edge. It reads `seriesMax`, one interval inside the exclusive
        // `hard_bounds.max`, so the newest bucket can actually hold docs.
        extended_bounds: { max: seriesMax },
        hard_bounds: hardBounds,
      },
      aggs: {
        per_minute: {
          date_histogram: {
            field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
            fixed_interval: '1m',
            min_doc_count: 1,
          },
          aggs: {
            minute_value: {
              max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
            },
          },
        },
        // `sum_bucket` yields 0.0 on an empty outer bucket by itself, so the
        // series needs no scripted zero-fill — only a gap policy that reads it.
        metric_value: {
          sum_bucket: {
            buckets_path: 'per_minute>minute_value',
          },
        },
      },
    });
    // `keep_values` is load-bearing: the default `skip` policy discards every
    // bucket with `doc_count == 0` before reading its value, which would drop
    // every gap and leave change_point `indeterminable`.
    expect(aggs.change_points).toEqual({
      change_point: {
        buckets_path: 'over_time>metric_value',
        gap_policy: 'keep_values',
      },
    });
  });
});
