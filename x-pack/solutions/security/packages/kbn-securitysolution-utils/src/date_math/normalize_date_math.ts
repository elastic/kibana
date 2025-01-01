/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertTimeDurationToMs } from '../time_duration/convert_time_duration_to_ms';
import { parseDateMath } from './parse_date_math';
import { toLargestTimeDuration } from '../time_duration/to_largest_time_duration';

/**
 * Normalizes Date Math expression by converting time offset to
 * the largest whole units, e.g.
 *
 * - `now-60s` gets converted to `now-1m`
 * - `now-60m` gets converted to `now-1h`
 * - `now-3600s` gets converted to `now-1h`
 *
 */
export function normalizeDateMath(input: string): string {
  const parsed = parseDateMath(input);

  if (parsed === undefined) {
    return input;
  }

  if (parsed.offsetValue === 0) {
    return 'now';
  }

  const offsetMs = convertTimeDurationToMs(`${parsed.offsetValue}${parsed.offsetUnit}`);

  if (!offsetMs) {
    return input;
  }

  const sign = parsed.offsetValue >= 0 ? '+' : '';

  return `now${sign}${toLargestTimeDuration(offsetMs)}`;
}
