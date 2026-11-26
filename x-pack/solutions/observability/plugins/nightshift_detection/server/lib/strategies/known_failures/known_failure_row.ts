/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { RuleRow } from '../../rules/managed_rule_reader';
import { KNOWN_FAILURES_SETTINGS } from './constants';

/**
 * The columns the rule query returns, as `.rule-events` stores them: dates as epoch milliseconds, a
 * one-value `VALUES` as a plain string, and the change point columns missing when the window held no
 * step or trend change.
 */
const knownFailureRowSchema = lazySchema(() =>
  z.object({
    newest_minute_counts: z.union([z.string(), z.array(z.string())]),
    baseline_median: z.number(),
    baseline_mad: z.number(),
    baseline_mean: z.number(),
    baseline_std_dev: z.number(),
    change_point_at: z.number().int().nullish(),
    change_point_type: z.string().nullish(),
    change_point_pvalue: z.number().nullish(),
    change_point_median_before: z.number().nullish(),
    change_point_minutes_before: z.number().int().nullish(),
    change_point_median_after: z.number().nullish(),
    recent_median: z.number(),
    earlier_median: z.number(),
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
  /** Median from the change before this one, or the window start, up to this one. */
  before_median: number;
  before_minutes: number;
  after_median: number;
}

/** One run of a Known failures rule, decoded. */
export interface KnownFailureMeasurement {
  rule_id: string;
  /** The run's newest minutes, oldest first; `minute` is the minute's start in epoch milliseconds. */
  minutes: Array<{ minute: number; count: number }>;
  baseline: KnownFailureBaseline;
  change?: KnownFailureChange;
  /** Median of the last `recent_minutes`. */
  recent_median: number;
  /** Median of the window's oldest `earlier_minutes`. */
  earlier_median: number;
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

  const minutes = [data.newest_minute_counts].flat().map(parseMinuteCount);
  if (minutes.length === 0 || minutes.some((minute) => minute === undefined)) {
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
    recent_median: data.recent_median,
    earlier_median: data.earlier_median,
  };
}

/** `<minute start>=<count>`, as the rule packs each minute. */
function parseMinuteCount(packed: string): { minute: number; count: number } | undefined {
  const separator = packed.lastIndexOf('=');
  const minute = Date.parse(packed.slice(0, separator));
  // Digits only: `Number('')` is 0, and a count is never negative. Safe, because a long enough
  // run of digits converts to `Infinity`.
  const countText = packed.slice(separator + 1);
  const count = Number(countText);
  return separator > 0 &&
    Number.isFinite(minute) &&
    /^\d+$/.test(countText) &&
    Number.isSafeInteger(count)
    ? { minute, count }
    : undefined;
}

function toChange(data: z.infer<typeof knownFailureRowSchema>): KnownFailureChange | undefined {
  const {
    change_point_at: at,
    change_point_type: type,
    change_point_pvalue: pvalue,
    change_point_median_before: beforeMedian,
    change_point_minutes_before: beforeMinutes,
    change_point_median_after: afterMedian,
  } = data;
  // All set or none: the rule fills them together from the same change point.
  if (
    at == null ||
    type == null ||
    pvalue == null ||
    beforeMedian == null ||
    beforeMinutes == null ||
    afterMedian == null
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
  };
}

const MINUTE_MS = 60_000;

/** Where the parts of a run's window start, in epoch milliseconds. */
export interface RunWindow {
  start: number;
  baselineStart: number;
  lastMinute: number;
}

/**
 * Where a run's window and its parts start. Example: a run whose newest minute is 12:00 covers
 * 06:01 to 12:00 (`start` 06:01), measures its normal level from 10:54 (`baselineStart`), and
 * returns counts for 11:54 to 12:00.
 */
export function getRunWindow({ minutes }: Pick<KnownFailureMeasurement, 'minutes'>): RunWindow {
  const {
    window_minutes: window,
    newest_minutes: newest,
    baseline_minutes: baseline,
  } = KNOWN_FAILURES_SETTINGS;
  const end = minutes[minutes.length - 1].minute + MINUTE_MS;
  return {
    start: end - window * MINUTE_MS,
    baselineStart: end - (newest + baseline) * MINUTE_MS,
    lastMinute: end - MINUTE_MS,
  };
}
