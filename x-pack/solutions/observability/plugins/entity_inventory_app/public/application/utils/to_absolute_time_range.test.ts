/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { toAbsoluteTimeRange } from './to_absolute_time_range';

const NOW = new Date('2026-10-30T12:00:00.000Z');

describe('toAbsoluteTimeRange', () => {
  it('resolves a relative range against now', () => {
    expect(toAbsoluteTimeRange({ from: 'now-15m', to: 'now' }, NOW)).toEqual({
      from: '2026-10-30T11:45:00.000Z',
      to: '2026-10-30T12:00:00.000Z',
    });
  });

  it('keeps the instants of an absolute range', () => {
    expect(
      toAbsoluteTimeRange({ from: '2026-10-29T08:00:00.000Z', to: '2026-10-29T09:30:00.000Z' }, NOW)
    ).toEqual({ from: '2026-10-29T08:00:00.000Z', to: '2026-10-29T09:30:00.000Z' });
  });

  it('rounds a rounded end up to the end of its unit', () => {
    const range = toAbsoluteTimeRange({ from: 'now/d', to: 'now/d' }, NOW);

    expect(range).toEqual({
      from: moment(NOW).startOf('day').toISOString(),
      to: moment(NOW).endOf('day').toISOString(),
    });
  });

  it('returns undefined for an invalid bound', () => {
    expect(toAbsoluteTimeRange({ from: 'now-5x', to: 'now' }, NOW)).toBeUndefined();
    expect(toAbsoluteTimeRange({ from: 'now-15m', to: 'now+1x' }, NOW)).toBeUndefined();
  });
});
