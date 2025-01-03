/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTimeDuration } from './parse_time_duration';

/**
 * Tries to convert time duration `{value}{unit}` (e.g. 3m, 5h, 6s) to milliseconds.
 * Supports
 *  - `s` seconds, e.g. 3s, 0s, -5s
 *  - `m` minutes, e.g. 10m, 0m
 *  - `h` hours, e.g. 7h
 *  - `d` days, e.g. 3d
 *
 * Returns `undefined` when unable to perform conversion.
 */
export function convertTimeDurationToMs(input: string): number | undefined {
  const duration = parseTimeDuration(input);

  if (!duration) {
    return;
  }

  switch (duration.unit) {
    case 's':
      return duration.value * 1000;
    case 'm':
      return duration.value * 1000 * 60;
    case 'h':
      return duration.value * 1000 * 60 * 60;
    case 'd':
      return duration.value * 1000 * 60 * 60 * 24;
  }
}
