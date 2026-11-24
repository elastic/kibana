/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { RuleRow } from '../../rules/managed_rule_reader';

/**
 * The columns the rule query returns, as `.rule-events` stores them: dates as epoch milliseconds, a
 * one-value `VALUES` as a plain string, and the change point columns empty when the window held no
 * step or trend change.
 */
const knownFailureRowSchema = lazySchema(() =>
  z.object({
    newest_counts: z.union([z.string(), z.array(z.string())]),
    baseline_median: z.number(),
    baseline_mad: z.number(),
    baseline_mean: z.number(),
    baseline_std_dev: z.number(),
    change_at: z.number().int().nullish(),
    change_type: z.string().nullish(),
    change_pvalue: z.number().nullish(),
    before_change_median: z.number().nullish(),
    before_change_minutes: z.number().int().nullish(),
    after_change_median: z.number().nullish(),
    recent_median: z.number().nullish(),
  })
);

/** A knowledge indicator's normal level over the hour before the newest minutes of a run. */
export interface KnownFailureBaseline {
  median: number;
  mad: number;
  mean: number;
  std_dev: number;
}

/** The latest step or trend change the rule found in its window, with the levels around it. */
export interface KnownFailureChange {
  /** Epoch milliseconds. */
  at: number;
  type: string;
  pvalue: number;
  before_median: number;
  before_minutes: number;
  after_median: number;
  recent_median: number;
}

/** One run of a Known failures rule, decoded. */
export interface KnownFailureMeasurement {
  rule_id: string;
  /** The run's newest minutes, oldest first; `minute` is the minute's start in epoch milliseconds. */
  minutes: Array<{ minute: number; count: number }>;
  baseline: KnownFailureBaseline;
  change?: KnownFailureChange;
}

/**
 * Decodes a row of a Known failures rule, or returns `undefined` when it lacks the columns the rule
 * query returns, such as a row written by an older version of the query.
 */
export function decodeKnownFailureRow(row: RuleRow): KnownFailureMeasurement | undefined {
  const parsed = knownFailureRowSchema.safeParse(row.data);
  if (!parsed.success) {
    return undefined;
  }
  const { data } = parsed;

  const minutes = [data.newest_counts].flat().map(parseMinuteCount);
  if (minutes.some((minute) => minute === undefined)) {
    return undefined;
  }

  return {
    rule_id: row.rule_id,
    minutes: (minutes as Array<{ minute: number; count: number }>).sort(
      (left, right) => left.minute - right.minute
    ),
    baseline: {
      median: data.baseline_median,
      mad: data.baseline_mad,
      mean: data.baseline_mean,
      std_dev: data.baseline_std_dev,
    },
    change: toChange(data),
  };
}

/** `<minute start>=<count>`, as the rule packs each minute. */
function parseMinuteCount(packed: string): { minute: number; count: number } | undefined {
  const separator = packed.lastIndexOf('=');
  const minute = Date.parse(packed.slice(0, separator));
  const count = Number(packed.slice(separator + 1));
  return separator > 0 && Number.isFinite(minute) && Number.isInteger(count)
    ? { minute, count }
    : undefined;
}

function toChange(data: z.infer<typeof knownFailureRowSchema>): KnownFailureChange | undefined {
  const {
    change_at: at,
    change_type: type,
    change_pvalue: pvalue,
    before_change_median: beforeMedian,
    before_change_minutes: beforeMinutes,
    after_change_median: afterMedian,
    recent_median: recentMedian,
  } = data;
  // All set or none: the rule fills them together from the same change point.
  if (
    at == null ||
    type == null ||
    pvalue == null ||
    beforeMedian == null ||
    beforeMinutes == null ||
    afterMedian == null ||
    recentMedian == null
  ) {
    return undefined;
  }
  return {
    at,
    type,
    pvalue,
    before_median: beforeMedian,
    before_minutes: beforeMinutes,
    after_median: afterMedian,
    recent_median: recentMedian,
  };
}
