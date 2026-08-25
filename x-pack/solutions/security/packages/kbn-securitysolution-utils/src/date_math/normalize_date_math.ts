/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeDuration } from '../time_duration/time_duration';
import { calcDateMathDiff } from './calc_date_math_diff';

/**
 * Normalizes date math
 */
export function normalizeDateMath(input: string): string {
  try {
    const ms = calcDateMathDiff('now', input);

    if (ms === undefined || (ms > -1000 && ms < 1000)) {
      return input;
    }

    if (ms === 0) {
      return 'now';
    }

    const offset = TimeDuration.fromMilliseconds(ms);

    return offset.value < 0 ? `now${offset}` : `now+${offset}`;
  } catch {
    return input;
  }
}
