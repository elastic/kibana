/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommonTimeRanges } from '.';

describe('getCommonTimeRanges', () => {
  it('returns the correct time ranges', () => {
    const timeRanges = getCommonTimeRanges();

    expect(timeRanges).toEqual([
      { end: 'now', label: 'Today', start: 'now/d' },
      { end: 'now', label: 'This week', start: 'now/w' },
      { end: 'now', label: 'Last 15 minutes', start: 'now-15m' },
      { end: 'now', label: 'Last 30 minutes', start: 'now-30m' },
      { end: 'now', label: 'Last 1 hour', start: 'now-1h' },
      { end: 'now', label: 'Last 24 hours', start: 'now-24h' },
      { end: 'now', label: 'Last 7 days', start: 'now-7d' },
      { end: 'now', label: 'Last 30 days', start: 'now-30d' },
      { end: 'now', label: 'Last 90 days', start: 'now-90d' },
      { end: 'now', label: 'Last 1 year', start: 'now-1y' },
    ]);
  });
});
