/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSimpleRuleSchedule } from './rule_schedule';

describe('toSimpleRuleSchedule', () => {
  it.each([['10s'], ['3m'], ['5h']])('returns interval "%s" without changes', (interval) => {
    const result = toSimpleRuleSchedule({
      interval,
      from: 'now-10h',
      to: 'now',
    });

    expect(result?.interval).toBe(interval);
  });

  it.each([
    ['now-20s', '10s', '10s'],
    ['now-30m', '10m', '20m'],
    ['now-3h', '1h', '2h'],
    ['now-120s', '1m', '1m'],
    ['now-180m', '2h', '1h'],
    ['now-7200s', '90m', '30m'],
  ])('returns lookback (from=%s and interval=%s)', (from, interval, expected) => {
    const result = toSimpleRuleSchedule({
      interval,
      from,
      to: 'now',
    });

    expect(result?.lookback).toBe(expected);
  });

  it('returns zero lookback', () => {
    const result = toSimpleRuleSchedule({
      interval: '10m',
      from: 'now-10m',
      to: 'now',
    });

    expect(result?.lookback).toBe('0s');
  });

  describe('for invalid rule schedule', () => {
    it('returns "undefined" when interval is invalid', () => {
      const result = toSimpleRuleSchedule({
        interval: 'invalid',
        from: 'now-11m',
        to: 'now',
      });

      expect(result).toBeUndefined();
    });

    it('returns "undefined" when from is invalid', () => {
      const result = toSimpleRuleSchedule({
        interval: '10m',
        from: 'invalid',
        to: 'now',
      });

      expect(result).toBeUndefined();
    });

    it('returns "undefined" when to is invalid', () => {
      const result = toSimpleRuleSchedule({
        interval: '10m',
        from: 'now-11m',
        to: 'invalid',
      });

      expect(result).toBeUndefined();
    });

    it('returns "undefined" when to is not equal "now"', () => {
      const result = toSimpleRuleSchedule({
        interval: '10m',
        from: 'now-11m',
        to: 'now-1m',
      });

      expect(result).toBeUndefined();
    });

    it('returns "undefined" when result lookback is negative', () => {
      const result = toSimpleRuleSchedule({
        interval: '10m',
        from: 'now-5m',
        to: 'now',
      });

      expect(result).toBeUndefined();
    });
  });
});
