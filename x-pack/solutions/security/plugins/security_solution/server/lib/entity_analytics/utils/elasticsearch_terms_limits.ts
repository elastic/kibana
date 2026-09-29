/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum number of terms allowed in a single `terms` query before Elasticsearch
 * rejects the request. Defaults to `index.max_terms_count` (65536) minus one so we
 * stay within the default cluster limit without requiring index setting changes.
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-terms-query.html
 */
export const DEFAULT_MAX_TERMS_QUERY_COUNT = 65535;

/**
 * Bucket budget for a single `getDailyAverageRiskScoreNormSeries` request. Kept below
 * Elasticsearch's default `search.max_buckets` (65,536) so there is headroom for the
 * per-entity parent buckets and aggregation overhead the coordinating node also counts.
 */
export const MAX_RISK_SCORE_AGG_BUCKETS = 60000;

const RELATIVE_UNIT_DAYS: Record<string, number> = {
  s: 1 / 86400,
  m: 1 / 1440,
  h: 1 / 24,
  d: 1,
  w: 7,
  M: 31, // upper bound so the estimate never under-counts buckets
  y: 366,
};

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Best-effort upper bound on the number of daily buckets a lookback range can produce.
 * Handles the common relative forms (`now`, `now-90d`, `now-12w`, …) and absolute ISO
 * endpoints; anything it can't parse falls back to a conservative one-year estimate, so
 * an unusual range shrinks the batch rather than risking a `too_many_buckets_exception`.
 */
export const estimateLookbackDays = (range: {
  readonly gte: string;
  readonly lte: string;
}): number => {
  const CONSERVATIVE_FALLBACK_DAYS = 366;

  const toOffsetDays = (value: string): number | undefined => {
    if (value === 'now') {
      return 0;
    }
    const relative = /^now([+-])(\d+)([smhdwMy])$/.exec(value);
    if (relative) {
      const [, sign, amount, unit] = relative;
      const days = Number(amount) * RELATIVE_UNIT_DAYS[unit];
      return sign === '-' ? -days : days;
    }
    const absolute = Date.parse(value);
    if (!Number.isNaN(absolute)) {
      return (absolute - Date.now()) / MILLIS_PER_DAY;
    }
    return undefined;
  };

  const gteDays = toOffsetDays(range.gte);
  const lteDays = toOffsetDays(range.lte);
  if (gteDays === undefined || lteDays === undefined) {
    return CONSERVATIVE_FALLBACK_DAYS;
  }

  return Math.max(1, Math.ceil(Math.abs(lteDays - gteDays)));
};

/**
 * Entities to request per aggregation call so that `entities × daily buckets` stays under
 * {@link MAX_RISK_SCORE_AGG_BUCKETS}, while never exceeding the terms-query limit.
 */
export const riskScoreSeriesEntityBatchSize = (range: {
  readonly gte: string;
  readonly lte: string;
}): number => {
  // +2 per entity: one for the entity's own terms bucket, one for histogram edge headroom.
  const bucketsPerEntity = estimateLookbackDays(range) + 2;
  const bucketSafeBatchSize = Math.max(
    1,
    Math.floor(MAX_RISK_SCORE_AGG_BUCKETS / bucketsPerEntity)
  );
  return Math.min(DEFAULT_MAX_TERMS_QUERY_COUNT, bucketSafeBatchSize);
};
