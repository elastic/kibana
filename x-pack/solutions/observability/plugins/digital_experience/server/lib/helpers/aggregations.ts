/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TermsAggregation {
  buckets: Array<{ key: string | number }>;
}

export interface PercentilesAggregation {
  values: Array<{ key: number; value: number | null }>;
}

export const bucketKeys = (aggregation?: TermsAggregation): string[] =>
  (aggregation?.buckets ?? []).map(({ key }) => String(key));

export const getP75 = ({ values }: PercentilesAggregation): number | null =>
  values[0]?.value ?? null;

export const p75Of = (field: string) => ({
  percentiles: { field, percents: [75], keyed: false },
});

export interface ValueCountAggregation {
  value: number;
}

/** The documents of a bucket that have a value for `field`, e.g. the samples of a percentile. */
export const countOf = (field: string) => ({ value_count: { field } });

/** The latest document of a bucket. */
export const LAST_SEEN_AGGREGATION = { max: { field: '@timestamp' } } as const;

/** ISO time of the latest of the given `max` timestamps, `null` without any. */
export const toLastSeen = (...maxValues: Array<number | null | undefined>): string | null => {
  const latest = Math.max(...maxValues.filter((value): value is number => value != null));
  return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
};

/** `numerator / denominator`, `null` without a denominator (e.g. no page loads, no requests). */
export const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;
