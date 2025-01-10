/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { calcDateMathDiff } from '@kbn/securitysolution-utils/date_math';
import { TimeDuration as TimeDurationUtil } from '@kbn/securitysolution-utils/time_duration';
import { RuleIntervalFrom, RuleIntervalTo } from './common_attributes.gen';
import { TimeDuration as TimeDurationSchema } from './time_duration';

export type RuleSchedule = z.infer<typeof RuleSchedule>;
export const RuleSchedule = z.object({
  interval: TimeDurationSchema({ allowedUnits: ['s', 'm', 'h'] }),
  from: RuleIntervalFrom,
  to: RuleIntervalTo,
});

/**
 * Simpler version of RuleSchedule. It's only feasible when
 * - `to` equals `now` (current moment in time)
 * - `from` is less than `now` - `interval`
 *
 * Examples:
 *
 * - rule schedule: interval = 10m, from = now-15m, to = now
 *   simpler rule schedule: interval = 10m, lookback = 5m
 *
 * - rule schedule: interval = 1h, from = now-120m, to = now
 *   simpler rule schedule: interval = 10m, lookback = 5m
 */
export type SimpleRuleSchedule = z.infer<typeof SimpleRuleSchedule>;
export const SimpleRuleSchedule = z.object({
  /**
   * Rule running interval in time duration format, e.g. `2m`, `3h`
   */
  interval: TimeDurationSchema({ allowedUnits: ['s', 'm', 'h'] }),
  /**
   * Non-negative additional source events look-back to compensate rule execution delays
   * in time duration format, e.g. `2m`, `3h`.
   *
   * Having `interval`, `from` and `to` and can be calculated as
   *
   * lookback = now - `interval` - `from`, where `now` is the current moment in time
   *
   * In the other words rules use time range [now - interval - lookback, now]
   * to select source events for analysis.
   */
  lookback: TimeDurationSchema({ allowedUnits: ['s', 'm', 'h'] }),
});

/**
 * Transforms RuleSchedule to SimpleRuleSchedule by replacing `from` and `to` with `lookback`.
 *
 * The transformation is only possible when `to` equals to `now` and result `lookback` is non-negative.
 */
export function toSimpleRuleSchedule(ruleSchedule: RuleSchedule): SimpleRuleSchedule | undefined {
  if (ruleSchedule.to !== 'now') {
    return undefined;
  }

  const lookBackMs = calcDateMathDiff(ruleSchedule.from, `now-${ruleSchedule.interval}`);

  if (lookBackMs === undefined || lookBackMs < 0) {
    return undefined;
  }

  return {
    interval: ruleSchedule.interval,
    lookback: TimeDurationUtil.fromMilliseconds(lookBackMs).toString(),
  };
}
