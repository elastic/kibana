/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fiveMinute, twoMinute } from '../fixtures/duration';
import { createSLO } from '../fixtures/slo';
import { thirtyDaysRolling } from '../fixtures/time_window';
import { getTimesliceTargetComparator, parseIndex, getFilterRange } from './common';

describe('common', () => {
  describe('parseIndex', () => {
    it.each([
      ['foo-*', 'foo-*'],
      ['foo-*,bar-*', ['foo-*', 'bar-*']],
      ['remote:foo-*', 'remote:foo-*'],
      ['remote:foo*,bar-*', ['remote:foo*', 'bar-*']],
      ['remote:foo*,remote:bar-*', ['remote:foo*', 'remote:bar-*']],
      ['remote:foo*,bar-*,remote:baz-*', ['remote:foo*', 'bar-*', 'remote:baz-*']],
    ])("parses the index '%s' correctly", (index, expected) => {
      expect(parseIndex(index)).toEqual(expected);
    });
  });

  describe('timeslice target comparator', () => {
    it('returns GT when timeslice target is 0', () => {
      expect(getTimesliceTargetComparator(0)).toBe('>');
    });

    it('returns GTE when timeslice tyarnarget is not 0', () => {
      expect(getTimesliceTargetComparator(0.000000001)).toBe('>=');
    });
  });

  describe('getFilterRange', () => {
    it('starts at now (accounting for delay) when preventInitialBackfill is true', () => {
      expect(
        getFilterRange(
          createSLO({
            settings: {
              frequency: twoMinute(),
              syncDelay: fiveMinute(),
              preventInitialBackfill: true,
            },
          }),
          '@timestamp',
          false
        )
      ).toEqual({
        range: {
          '@timestamp': {
            gte: 'now-480s/m',
          },
        },
      });
    });

    it('starts at now minus the time window when preventInitialBackfill is false', () => {
      expect(
        getFilterRange(
          createSLO({
            timeWindow: thirtyDaysRolling(),
            settings: {
              frequency: twoMinute(),
              syncDelay: fiveMinute(),
              preventInitialBackfill: false,
            },
          }),
          '@timestamp',
          false
        )
      ).toEqual({
        range: {
          '@timestamp': {
            gte: 'now-30d/d',
          },
        },
      });
    });

    it('starts at now minus 7 days when preventInitialBackfill is false and serverless is true', () => {
      expect(
        getFilterRange(
          createSLO({
            timeWindow: thirtyDaysRolling(),
            settings: {
              frequency: twoMinute(),
              syncDelay: fiveMinute(),
              preventInitialBackfill: false,
            },
          }),
          '@timestamp',
          true
        )
      ).toEqual({
        range: {
          '@timestamp': {
            gte: 'now-7d',
          },
        },
      });
    });
  });
});
