/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaselineObservation } from '@kbn/significant-events-schema';
import { canCompileMatchMetric } from './can_compile_match_metric';
import type { StoredQueryRunner } from './run_probe';

// Same statistic as the detection-engine prototype: median plus a MAD band, with a floor so a flat
// history does not flag noise.
/** A baseline needs at least this many history buckets; with fewer it is only warming up. */
export const MIN_BASELINE_SAMPLES = 10;
const MAD_BAND = 3 * 1.4826;
const MIN_DELTA = 3;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export const checkBaseline = ({
  value,
  history,
}: {
  value: number;
  history: readonly number[];
}): BaselineObservation => {
  if (history.length < MIN_BASELINE_SAMPLES) {
    return { decision: 'warming_up', value, samples: history.length };
  }
  const center = median(history);
  const mad = median(history.map((sample) => Math.abs(sample - center)));
  const threshold = center + Math.max(MAD_BAND * mad, MIN_DELTA);
  return {
    decision: value > threshold ? 'above_normal' : 'background',
    value,
    samples: history.length,
    median: center,
    threshold,
  };
};

// An earlier level is not news until the count moves past this margin: a doubling up, or half of it
// down, or three Poisson standard deviations where counts are small. Not fitted to any data.
const JUDGED_DROP_RATIO = 0.5;
const JUDGED_POISSON_SIGMAS = 3;

/** Which way, if any, a match count has moved beyond an earlier count. */
export const shiftFrom = ({
  value,
  from,
}: {
  value: number;
  from: number;
}): 'up' | 'down' | undefined => {
  const noise = Math.max(JUDGED_POISSON_SIGMAS * Math.sqrt(from), MIN_DELTA);
  if (value > from + Math.max(from, noise)) return 'up';
  if (value < from - Math.max(JUDGED_DROP_RATIO * from, noise)) return 'down';
  return undefined;
};

/**
 * How the match count changed since a verdict was made, in a way that verdict has not seen. `rose`:
 * it is above the rule's normal, and either the verdict was made at a normal level or the count has
 * since moved well past the abnormal level it was made at. `recovered`: the verdict was made at an
 * abnormal level and the count is back within the normal band of that time. A rule judged at a
 * normal level cannot recover, so a rule that cycles is never sent back for its low phase.
 */
export const changeSinceJudged = ({
  observed,
  judged,
}: {
  observed: BaselineObservation;
  judged: BaselineObservation | undefined;
}): 'rose' | 'recovered' | undefined => {
  const judgedAbnormal = judged?.decision === 'above_normal';
  const shift = judged ? shiftFrom({ value: observed.value, from: judged.value }) : undefined;
  if (observed.decision === 'above_normal' && (!judgedAbnormal || shift === 'up')) return 'rose';
  if (
    judgedAbnormal &&
    shift === 'down' &&
    judged.threshold !== undefined &&
    observed.value <= judged.threshold
  ) {
    return 'recovered';
  }
  return undefined;
};

/** A rule's match counts per bucket, oldest first; the last bucket is the latest complete one. */
export interface MatchSeries {
  /** Start of the oldest bucket, in epoch milliseconds. */
  firstStart: number;
  bucketMs: number;
  counts: readonly number[];
}

/** The index of the bucket that holds `time`, if the series covers it. */
const indexAt = (series: MatchSeries, time: number): number | undefined => {
  const index = Math.floor((time - series.firstStart) / series.bucketMs);
  return index >= 0 && index < series.counts.length ? index : undefined;
};

/** The counts of the buckets after the one that holds `time`, up to the latest. */
export const countsAfter = (series: MatchSeries, time: number): readonly number[] => {
  const index = indexAt(series, time);
  return index === undefined ? [] : series.counts.slice(index + 1);
};

/** The count of the bucket that holds `time`, if the series covers it. */
export const countAt = (series: MatchSeries, time: number): number | undefined => {
  const index = indexAt(series, time);
  return index === undefined ? undefined : series.counts[index];
};

/** Whether any of the `spanBuckets` buckets ending at the one that holds `time` has matches. */
export const hasRowsAt = ({
  series,
  time,
  spanBuckets,
}: {
  series: MatchSeries;
  time: number;
  spanBuckets: number;
}): boolean | undefined => {
  const index = indexAt(series, time);
  if (index === undefined || index + 1 < spanBuckets) return undefined;
  return series.counts.slice(index + 1 - spanBuckets, index + 1).some((count) => count > 0);
};

/**
 * The baseline observation of the bucket that holds `time`, against the buckets before it. None when
 * the series does not cover it or has too little history before it to judge.
 */
export const observationAt = (
  series: MatchSeries,
  time: number
): BaselineObservation | undefined => {
  const index = indexAt(series, time);
  if (index === undefined || index < MIN_BASELINE_SAMPLES) return undefined;
  return checkBaseline({ value: series.counts[index], history: series.counts.slice(0, index) });
};

/**
 * A time in the last complete bucket before the one that holds `time`: the level something at
 * `time` could have seen. The bucket that holds `time` is later activity, since it can include
 * matches that came after, so a verdict or a review is read against the bucket before it.
 */
export const seenAt = (series: MatchSeries, time: number): number => time - series.bucketMs;

/**
 * Observes a filter-only match query: its count per bucket over the window of complete buckets, the
 * latest complete one against the rest. Anything else (aggregating queries, missing query, a failed
 * run) yields no observation.
 */
export const observeMatchSeries = async ({
  query,
  now,
  run,
  bucketMinutes,
  windowMinutes,
}: {
  query: string | undefined;
  now: number;
  run: StoredQueryRunner;
  bucketMinutes: number;
  windowMinutes: number;
}): Promise<{ observation: BaselineObservation; series: MatchSeries } | undefined> => {
  if (!query || !canCompileMatchMetric(query)) return undefined;

  const bucketMs = bucketMinutes * 60_000;
  const historyBuckets = Math.floor(windowMinutes / bucketMinutes);
  const currentStart = Math.floor(now / bucketMs) * bucketMs - bucketMs;
  const firstStart = currentStart - historyBuckets * bucketMs;
  const { status, values } = await run({
    query,
    // The explicit limit keeps every bucket of the window, past ES|QL's default row limit.
    tail: `STATS c = COUNT(*) BY b = BUCKET(@timestamp, ${bucketMinutes} minute) | KEEP b, c | SORT b DESC | LIMIT ${
      historyBuckets + 1
    }`,
    window: {
      from: new Date(firstStart).toISOString(),
      to: new Date(currentStart + bucketMs).toISOString(),
    },
  });
  if (status !== 'ok') return undefined;

  // ES|QL returns no row for a bucket without matches, so absent buckets are zeros.
  const byStart = new Map(
    values.map(([bucket, count]) => [Date.parse(String(bucket)), Number(count)])
  );
  const counts = Array.from(
    { length: historyBuckets + 1 },
    (_, i) => byStart.get(firstStart + i * bucketMs) ?? 0
  );
  return {
    observation: checkBaseline({ value: counts[historyBuckets], history: counts.slice(0, -1) }),
    series: { firstStart, bucketMs, counts },
  };
};
