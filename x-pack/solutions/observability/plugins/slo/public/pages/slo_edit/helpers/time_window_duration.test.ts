/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeWindowType } from '@kbn/slo-schema';
import { pickTimeWindowDuration } from './time_window_duration';

describe('pickTimeWindowDuration', () => {
  it.each<[TimeWindowType, string | undefined, string]>([
    ['rolling', '7d', '7d'],
    ['calendarAligned', '7d', '1M'],
    ['rolling', '1w', '30d'],
    ['calendarAligned', '1w', '1w'],
    ['rolling', undefined, '30d'],
    ['calendarAligned', undefined, '1M'],
  ])('picks %s duration from initial duration %s: %s', (type, initialDuration, expected) => {
    expect(pickTimeWindowDuration(type, initialDuration)).toBe(expected);
  });
});
