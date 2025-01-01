/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { TimeDuration } from './time_duration';

/**
 * Simpler version of RuleSchedule. It's only feasible when
 * - `to` equals `now` (current moment in time)
 * - `from` is less than `now` - `interval`
 */
export type SimpleRuleSchedule = z.infer<typeof SimpleRuleSchedule>;
export const SimpleRuleSchedule = z.object({
  /**
   * Rule running interval in time duration format, e.g. `2m`, `3h`
   */
  interval: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
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
  lookback: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
});
