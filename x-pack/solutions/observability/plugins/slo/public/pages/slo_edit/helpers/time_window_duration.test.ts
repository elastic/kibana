/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeWindowType } from '@kbn/slo-schema';
import { CALENDARALIGNED_TIMEWINDOW_OPTIONS, ROLLING_TIMEWINDOW_OPTIONS } from '../constants';
import { getTimeWindowDurationOptions, pickTimeWindowDuration } from './time_window_duration';

describe('getTimeWindowDurationOptions', () => {
  it('returns the rolling options for a rolling time window', () => {
    expect(getTimeWindowDurationOptions('rolling')).toBe(ROLLING_TIMEWINDOW_OPTIONS);
  });

  it('returns the calendar aligned options for a calendar aligned time window', () => {
    expect(getTimeWindowDurationOptions('calendarAligned')).toBe(
      CALENDARALIGNED_TIMEWINDOW_OPTIONS
    );
  });
});

describe('pickTimeWindowDuration', () => {
  it.each<[TimeWindowType, string | undefined, string]>([
    ['rolling', '30d', '30d'],
    ['calendarAligned', '30d', '1M'],
    ['rolling', '1w', '30d'],
    ['calendarAligned', '1w', '1w'],
    ['calendarAligned', '7d', '1M'],
    ['rolling', '7d', '7d'],
    ['rolling', undefined, '30d'],
    ['calendarAligned', undefined, '1M'],
  ])('picks %s duration from initial duration %s: %s', (type, initialDuration, expected) => {
    expect(pickTimeWindowDuration(type, initialDuration)).toBe(expected);
  });
});
