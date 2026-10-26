/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsExtendedBounds,
  AggregationsFieldDateMath,
} from '@elastic/elasticsearch/lib/api/types';
import {
  METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
  METRIC_SERIES_MAX_WRITE_DELAY,
} from '../rules/metric_series_contract';
import {
  getAnalysisWriteTimeLookback,
  getDurationMinutes,
  parseLookbackMinutes,
} from '../rules/schedule';
import {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
} from './rule_events_metric_series';

export const RULES_BUCKET_SIZE = 1000;

export { METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL } from '../rules/metric_series_contract';
export {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
  METRIC_SERIES_RUNTIME_MAPPINGS,
} from './rule_events_metric_series';

export interface ChangePointHistogramWindow {
  /**
   * Source-bucket span handed to `hard_bounds`. The upper edge is *exclusive*:
   * ES rounds it down to `fixed_interval` and then drops every bucket whose key
   * is `>= max` (`LongBounds.contain`).
   */
  hardBounds: AggregationsExtendedBounds<AggregationsFieldDateMath>;
  /**
   * Newest bucket the series may contain, one interval below the exclusive
   * upper edge of {@link ChangePointHistogramWindow.hardBounds}. Used as
   * `extended_bounds.max`.
   */
  seriesMax: AggregationsFieldDateMath;
  /** Write-time `@timestamp` prune that covers every source minute in `hardBounds`. */
  writeTimeLookback: string;
}

/**
 * Analysis window for change_point.
 *
 * `lookback` (`now-40m`) is the analysis *duration*. The series ends at the
 * reliable write horizon `now - MAX_WRITE_DELAY` so not-yet-written closed
 * minutes are excluded, and starts `duration` earlier. That span is
 * `hard_bounds`, which keeps out-of-window docs from stretching the histogram.
 *
 * `seriesMax` is one `bucketInterval` below the horizon rather than at it,
 * because `hard_bounds` treats its upper edge as exclusive while
 * `extended_bounds` emits a bucket *at* its own rounded `max`. Feeding both the
 * same instant would append a bucket that exists but can never receive a doc
 * (see {@link buildChangePointTimeSeriesAggs}). Stepping back one interval also
 * guarantees the newest bucket is complete: every source minute it covers is at
 * or below the horizon, so all of them are already written.
 *
 * The write-time prune is widened by `bucketInterval` on top of the source span
 * because ES rounds `hard_bounds.min` *down* to the interval grid, pulling in up
 * to `bucketInterval - 1m` of older source minutes whose rule events were
 * written before an un-widened prune would start.
 */
export function buildChangePointHistogramWindow(
  lookback: string,
  bucketInterval: string
): ChangePointHistogramWindow {
  const lookbackMinutes = parseLookbackMinutes(lookback);
  const writeDelayMinutes = getDurationMinutes(METRIC_SERIES_MAX_WRITE_DELAY);
  const bucketMinutes = getDurationMinutes(bucketInterval);

  return {
    hardBounds: {
      min: `now-${lookbackMinutes + writeDelayMinutes}m`,
      max: `now-${writeDelayMinutes}m`,
    },
    seriesMax: `now-${writeDelayMinutes + bucketMinutes}m`,
    writeTimeLookback: getAnalysisWriteTimeLookback(lookbackMinutes, bucketMinutes),
  };
}

/**
 * DSL equivalent of:
 *
 * ```esql
 * | EVAL metric_value = TO_LONG(FIELD_EXTRACT(data, "metric_value"))
 * | EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(data, "bucket")))
 * | STATS minute_value = MAX(metric_value) BY source_minute = DATE_TRUNC(1 minute, bucket)
 * | STATS metric_value = SUM(minute_value) BY bucket = BUCKET(source_minute, <interval>)
 * | CHANGE_POINT metric_value ON bucket
 * ```
 *
 * Outer interval is the configured analysis bucket size. Overlapping rule
 * re-emits are collapsed with per-minute MAX before SUM into the outer bucket.
 *
 * `min_doc_count: 0` already gives every empty outer bucket a `sum_bucket` of
 * `0.0`, so no scripted zero-fill is needed. What the series needs is for
 * `change_point` to read those buckets: under the default `skip`,
 * `BucketHelpers.GapPolicy.SKIP.processValue` maps any bucket with
 * `doc_count == 0` to NaN *before* looking at its value, so the gaps are
 * dropped and only doc-bearing buckets are analysed. `keep_values` ignores
 * `doc_count` and takes the value as-is. Requires the `gap_policy` option on
 * the `change_point` agg (elastic/elasticsearch#154973).
 *
 * `extended_bounds` carries only `max`. Pinning the upper edge keeps the
 * trailing zeros of a rule that has gone silent so a drop stays detectable;
 * leaving the lower edge open starts each rule's series at its own first
 * observed bucket, so a rule without history for the whole window gets a short
 * series and an honest `indeterminable` instead of a step up from fabricated
 * zeros that reads as a spike.
 *
 * That `max` is `seriesMax`, *not* `hardBounds.max`, and the two must stay
 * distinct. ES rounds both bounds down to `fixed_interval`, then applies them
 * with opposite inclusivity: `extended_bounds` emits a bucket at its rounded
 * `max`, while `hard_bounds` rejects any key `>= max`. Handing both the same
 * instant therefore creates a newest bucket that is always present and always
 * unreachable — a hard `0` that `keep_values` feeds to change_point as a real
 * observation, which reads as a dip on an otherwise healthy rule.
 */
export function buildChangePointTimeSeriesAggs({
  bucketInterval,
  hardBounds,
  seriesMax,
}: {
  bucketInterval: string;
  hardBounds: AggregationsExtendedBounds<AggregationsFieldDateMath>;
  seriesMax: AggregationsFieldDateMath;
}): Record<string, AggregationsAggregationContainer> {
  return {
    over_time: {
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: bucketInterval,
        min_doc_count: 0,
        extended_bounds: { max: seriesMax },
        hard_bounds: hardBounds,
      },
      aggs: {
        // Deduplicate overlapping MATCH recounts at source-minute resolution.
        per_minute: {
          date_histogram: {
            field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
            fixed_interval: METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
            min_doc_count: 1,
          },
          aggs: {
            minute_value: {
              max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
            },
          },
        },
        metric_value: {
          sum_bucket: {
            buckets_path: 'per_minute>minute_value',
          },
        },
      },
    },
    change_points: {
      change_point: {
        buckets_path: 'over_time>metric_value',
        gap_policy: 'keep_values',
      },
    },
  };
}
