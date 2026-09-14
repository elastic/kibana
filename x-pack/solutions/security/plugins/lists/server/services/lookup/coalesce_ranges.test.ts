/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coalesceBounds, coalesceRangeValues, parseValueToBound } from './coalesce_ranges';

describe('coalesceRangeValues', () => {
  describe('ip_range', () => {
    it('merges an overlapping CIDR and dash range into one interval', () => {
      expect(coalesceRangeValues('ip_range', ['10.0.0.0/24', '10.0.0.128-10.0.1.255'])).toEqual([
        { range_end: '10.0.1.255', range_start: '10.0.0.0' },
      ]);
    });

    it('keeps disjoint ranges separate and sorted', () => {
      expect(coalesceRangeValues('ip_range', ['192.168.1.5', '10.0.0.0/24'])).toEqual([
        { range_end: '10.0.0.255', range_start: '10.0.0.0' },
        { range_end: '192.168.1.5', range_start: '192.168.1.5' },
      ]);
    });

    it('expands a CIDR to its network and broadcast bounds', () => {
      expect(coalesceRangeValues('ip_range', ['10.0.0.0/30'])).toEqual([
        { range_end: '10.0.0.3', range_start: '10.0.0.0' },
      ]);
    });

    it('handles IPv6', () => {
      expect(coalesceRangeValues('ip_range', ['2001:db8::/126'])).toEqual([
        { range_end: '2001:db8:0:0:0:0:0:3', range_start: '2001:db8:0:0:0:0:0:0' },
      ]);
    });
  });

  describe('numeric ranges', () => {
    it('merges overlapping intervals and keeps disjoint ones', () => {
      expect(coalesceRangeValues('long_range', ['1-100', '50-200', '500-600'])).toEqual([
        { range_end: '200', range_start: '1' },
        { range_end: '600', range_start: '500' },
      ]);
    });

    it('treats a single value as a zero width interval', () => {
      expect(coalesceRangeValues('integer_range', ['42'])).toEqual([
        { range_end: '42', range_start: '42' },
      ]);
    });
  });

  describe('date_range', () => {
    it('merges overlapping date intervals authored as gte,lte', () => {
      expect(
        coalesceRangeValues('date_range', [
          '2026-01-01T00:00:00.000Z,2026-06-30T00:00:00.000Z',
          '2026-06-01T00:00:00.000Z,2026-12-31T00:00:00.000Z',
        ])
      ).toEqual([
        { range_end: '2026-12-31T00:00:00.000Z', range_start: '2026-01-01T00:00:00.000Z' },
      ]);
    });
  });

  describe('parseValueToBound', () => {
    it('expands a CIDR to stored bounds', () => {
      expect(parseValueToBound('ip_range', '10.0.0.0/30')).toEqual({
        range_end: '10.0.0.3',
        range_start: '10.0.0.0',
      });
    });

    it('keeps a dash range as its two ends', () => {
      expect(parseValueToBound('ip_range', '10.0.0.10-10.0.0.20')).toEqual({
        range_end: '10.0.0.20',
        range_start: '10.0.0.10',
      });
    });

    it('returns undefined for an unparseable value', () => {
      expect(parseValueToBound('ip_range', 'not-an-ip')).toBeUndefined();
    });
  });

  describe('coalesceBounds', () => {
    it('re-merges stored bounds (localized insert: overlapping intervals fold)', () => {
      expect(
        coalesceBounds('ip_range', [
          { range_end: '10.0.0.255', range_start: '10.0.0.0' },
          { range_end: '10.0.5.10', range_start: '10.0.0.128' },
          { range_end: '10.0.5.255', range_start: '10.0.5.0' },
        ])
      ).toEqual([{ range_end: '10.0.5.255', range_start: '10.0.0.0' }]);
    });

    it('leaves disjoint stored bounds fragmented (localized delete: no bridge)', () => {
      expect(
        coalesceBounds('ip_range', [
          { range_end: '10.0.0.255', range_start: '10.0.0.0' },
          { range_end: '10.0.2.255', range_start: '10.0.1.0' },
        ])
      ).toEqual([
        { range_end: '10.0.0.255', range_start: '10.0.0.0' },
        { range_end: '10.0.2.255', range_start: '10.0.1.0' },
      ]);
    });
  });
});
