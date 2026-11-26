/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from '../constants';
import { checkTimeRange, getMaxTimeRange } from './check_time_range';

const NOW = new Date('2026-10-21T12:00:00.000Z');

const check = (from: string, to: string, maxDays = ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS) =>
  checkTimeRange({ from, to }, maxDays, NOW);

describe('checkTimeRange', () => {
  describe('valid ranges', () => {
    it.each([
      ['a range shorter than the maximum', 'now-15m', 'now'],
      ['a range exactly equal to the maximum', 'now-3d', 'now'],
      ['a range ending in the future whose past part is within the maximum', 'now-1d', 'now+5d'],
      [
        'an absolute range within the maximum',
        '2026-10-20T00:00:00.000Z',
        '2026-10-21T00:00:00.000Z',
      ],
    ])('accepts %s', (_, from, to) => {
      expect(check(from, to)).toBe('valid');
    });

    it.each([
      ['This month', 'now/M', new Date(2026, 10, 1, 1)],
      ['This year', 'now/y', new Date(2027, 0, 1, 1)],
    ])('accepts "%s" right after the period starts', (_, unit, now) => {
      expect(checkTimeRange({ from: unit, to: unit }, 3, now)).toBe('valid');
    });
  });

  describe('ranges that are not allowed', () => {
    it.each([
      ['a range longer than the maximum', 'now-7d', 'now'],
      [
        'a range ending in the future whose past part is longer than the maximum',
        'now-7d',
        'now+5d',
      ],
      ['a long absolute range', '2026-10-01T00:00:00.000Z', '2026-10-11T00:00:00.000Z'],
    ])('rejects %s', (_, from, to) => {
      expect(check(from, to)).toBe('not_allowed');
    });

    it.each([
      ['a short relative window a week ago', 'now-8d', 'now-7d'],
      [
        'a short absolute window a week ago',
        '2026-10-14T10:00:00.000Z',
        '2026-10-14T11:00:00.000Z',
      ],
    ])('rejects %s because it starts earlier than the maximum', (_, from, to) => {
      expect(check(from, to)).toBe('not_allowed');
    });

    it('rejects a short window that starts just before the maximum lookback', () => {
      expect(check('2026-10-18T11:59:00.000Z', '2026-10-18T13:00:00.000Z')).toBe('not_allowed');
    });

    it('accepts a short window that starts right at the maximum lookback', () => {
      expect(check('2026-10-18T12:00:00.000Z', '2026-10-18T13:00:00.000Z')).toBe('valid');
    });

    it('rejects "This month" late in the month', () => {
      expect(checkTimeRange({ from: 'now/M', to: 'now/M' }, 3, new Date(2026, 9, 20, 12))).toBe(
        'not_allowed'
      );
    });
  });

  describe('invalid ranges', () => {
    it('marks invalid datemath as invalid', () => {
      expect(check('now-5x', 'now')).toBe('invalid');
    });

    it('marks a range whose start is after its end as invalid', () => {
      expect(check('now', 'now-1h')).toBe('invalid');
    });
  });

  describe('without a maximum', () => {
    it.each([
      ['now-1y/d', 'now'],
      ['2019-01-01T00:00:00.000Z', '2020-06-30T00:00:00.000Z'],
    ])('accepts %s to %s', (from, to) => {
      expect(check(from, to, Infinity)).toBe('valid');
    });

    it('still marks an invalid range as invalid', () => {
      expect(check('now-5x', 'now', Infinity)).toBe('invalid');
    });
  });
});

describe('getMaxTimeRange', () => {
  it('goes from the maximum number of days ago until now', () => {
    expect(getMaxTimeRange(3)).toEqual({ from: 'now-3d', to: 'now' });
  });

  it('gives a range that is allowed', () => {
    expect(checkTimeRange(getMaxTimeRange(ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS), 3, NOW)).toBe(
      'valid'
    );
  });
});
