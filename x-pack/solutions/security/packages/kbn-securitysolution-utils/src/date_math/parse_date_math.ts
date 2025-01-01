/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTimeDuration } from '../time_duration/parse_time_duration';

interface ParsedDateMath {
  pit: 'now';
  offsetValue: number;
  offsetUnit: 's' | 'm' | 'h';
}

/**
 * Parses Date Math expression and returns its parts
 *
 * - Point in time (pit)
 * - Offset value
 * - Offset unit
 *
 * It's a simplified version and supports only
 *
 * - `now` point in time
 * - seconds, minutes and hours
 */
export function parseDateMath(input: string): ParsedDateMath | undefined {
  if (input === 'now') {
    return {
      pit: 'now',
      offsetValue: 0,
      offsetUnit: 's',
    };
  }

  const offset = input.substring(3);

  if (!offset.startsWith('+') && !offset.startsWith('-')) {
    return;
  }

  const duration = parseTimeDuration(offset);

  if (!duration) {
    return;
  }

  return {
    pit: 'now',
    offsetValue: duration.value,
    offsetUnit: duration.unit as ParsedDateMath['offsetUnit'],
  };
}
