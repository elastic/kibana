/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  boundContains,
  coalesceRangeValues,
  parseValueToBound,
  uncoveredBounds,
  widenForAdjacency,
} from './coalesce_ranges';

const bound = (type: 'ip_range', value: string): { range_end: string; range_start: string } => {
  const parsed = parseValueToBound(type, value);
  if (parsed == null) throw new Error(`"${value}" did not parse`);
  return parsed;
};

describe('range bounds at the edges of the address and number spaces', () => {
  describe('widenForAdjacency clamps to the representable extremes', () => {
    it('does not step past the top of the IPv4 space into a wrapped address', () => {
      expect(widenForAdjacency('ip_range', bound('ip_range', '255.255.255.0/24'))).toEqual({
        // one step below the block; one step above 255.255.255.255 on the shared number
        // line is the IPv6 address after the mapped range, never a wrapped 0.0.0.0
        range_end: '0:0:0:0:1:0:0:0',
        range_start: '255.255.254.255',
      });
    });

    it('does not step past the top or bottom of the IPv6 space', () => {
      expect(widenForAdjacency('ip_range', bound('ip_range', '::/0'))).toEqual({
        range_end: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
        range_start: '0:0:0:0:0:0:0:0',
      });
    });

    it('does not step past the integer and long maxima, which Elasticsearch rejects', () => {
      expect(
        widenForAdjacency('integer_range', { range_end: '2147483647', range_start: '2147483640' })
      ).toEqual({
        range_end: '2147483647',
        range_start: '2147483639',
      });
      expect(
        widenForAdjacency('integer_range', { range_end: '5', range_start: '-2147483648' })
      ).toEqual({
        range_end: '6',
        range_start: '-2147483648',
      });
      expect(
        widenForAdjacency('long_range', { range_end: '9223372036854775807', range_start: '1' })
      ).toEqual({ range_end: '9223372036854775807', range_start: '0' });
    });
  });

  describe('IPv4 and IPv6 share the number line Elasticsearch uses', () => {
    it('places IPv4 at the mapped position, so a low IPv6 block never swallows an IPv4 block', () => {
      const merged = coalesceRangeValues('ip_range', ['::/100', '0.0.0.0/8']);
      expect(merged).toEqual([
        { range_end: '0:0:0:0:0:0:fff:ffff', range_start: '0:0:0:0:0:0:0:0' },
        { range_end: '0.255.255.255', range_start: '0.0.0.0' },
      ]);
    });

    it('rejects CIDR notation on an IPv4-mapped address, which Elasticsearch rejects too', () => {
      expect(parseValueToBound('ip_range', '::ffff:10.0.1.0/120')).toBeUndefined();
      expect(parseValueToBound('ip_range', '::ffff:10.0.1.0-::ffff:10.0.1.9')).toEqual({
        range_end: '10.0.1.9',
        range_start: '10.0.1.0',
      });
    });

    it('keeps the whole IPv4 space as one interval with IPv4 spellings', () => {
      expect(coalesceRangeValues('ip_range', ['0.0.0.0/0'])).toEqual([
        { range_end: '255.255.255.255', range_start: '0.0.0.0' },
      ]);
    });
  });

  describe('uncoveredBounds', () => {
    const block = (i: number): { range_end: string; range_start: string } => ({
      range_end: `10.${Math.floor(i / 256) % 256}.${i % 256}.255`,
      range_start: `10.${Math.floor(i / 256) % 256}.${i % 256}.0`,
    });

    it('finds exactly the sources outside every interval', () => {
      const intervals = [block(3), block(1), block(2)];
      const sources = [
        block(1),
        block(2),
        block(3),
        block(4),
        { range_end: '10.0.1.9', range_start: '10.0.1.0' },
      ];
      expect(uncoveredBounds('ip_range', intervals, sources)).toEqual([block(4)]);
    });

    it('checks tens of thousands of scattered ranges in well under a second', () => {
      const intervals = Array.from({ length: 50000 }, (_, i) => block(i * 1));
      const sources = intervals.map((b) => ({ ...b }));
      const started = Date.now();
      expect(uncoveredBounds('ip_range', intervals, sources)).toEqual([]);
      expect(Date.now() - started).toBeLessThan(1000);
    });
  });

  describe('boundContains', () => {
    it('compares across the mapped IPv4 position', () => {
      const all = {
        range_end: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
        range_start: '0:0:0:0:0:0:0:0',
      };
      expect(
        boundContains('ip_range', all, { range_end: '10.0.0.9', range_start: '10.0.0.1' })
      ).toBe(true);
      expect(
        boundContains(
          'ip_range',
          { range_end: '10.0.0.5', range_start: '10.0.0.1' },
          { range_end: '10.0.0.9', range_start: '10.0.0.1' }
        )
      ).toBe(false);
      expect(
        boundContains(
          'long_range',
          { range_end: '9223372036854775807', range_start: '0' },
          { range_end: '9007199254740993', range_start: '9007199254740993' }
        )
      ).toBe(true);
    });
  });
});
