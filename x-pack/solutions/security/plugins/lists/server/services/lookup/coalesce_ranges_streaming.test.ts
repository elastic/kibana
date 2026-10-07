/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import type { CoalescedBound } from './coalesce_ranges';
import {
  coalesceBounds,
  createStreamingCoalescer,
  parseValueToBound,
  uncoveredBounds,
  uncoveredInStreams,
} from './coalesce_ranges';

const bound = (start: string, end: string): CoalescedBound => ({
  range_end: end,
  range_start: start,
});

const streamOf = async function* <T>(items: T[]): AsyncGenerator<T, void, void> {
  for (const item of items) yield item;
};

/** Every finished interval a coalescer emits for `bounds`, fed in the given order. */
const drain = (type: Type, bounds: CoalescedBound[]): CoalescedBound[] => {
  const coalescer = createStreamingCoalescer(type);
  const out = bounds.flatMap((b) => coalescer.push(b));
  return [...out, ...coalescer.flush()];
};

// A deterministic generator, so a failing case can be replayed from its seed.
const lcg = (seed: number): (() => number) => {
  let state = seed;
  return (): number => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
};

const sortedIntegerBounds = (seed: number, count: number): CoalescedBound[] => {
  const random = lcg(seed);
  return Array.from({ length: count }, () => {
    const start = Math.floor(random() * 500);
    return bound(String(start), String(start + Math.floor(random() * 20)));
  }).sort((a, b) => Number(a.range_start) - Number(b.range_start));
};

describe('createStreamingCoalescer', () => {
  it('merges overlapping and adjacent integer bounds fed in start order', () => {
    expect(
      drain('integer_range', [bound('1', '10'), bound('11', '20'), bound('30', '40')])
    ).toEqual([bound('1', '20'), bound('30', '40')]);
  });

  it('keeps a gap of one between continuous bounds', () => {
    expect(drain('double_range', [bound('1', '10'), bound('11', '20')])).toEqual([
      bound('1', '10'),
      bound('11', '20'),
    ]);
  });

  it('emits nothing for no input and ignores a bound it cannot parse', () => {
    expect(drain('ip_range', [])).toEqual([]);
    expect(drain('ip_range', [bound('not-an-ip', 'x'), bound('10.0.0.0', '10.0.0.255')])).toEqual([
      bound('10.0.0.0', '10.0.0.255'),
    ]);
  });

  it('produces exactly what coalesceBounds produces, for many random sorted inputs', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const bounds = sortedIntegerBounds(seed, 40);
      expect(drain('integer_range', bounds)).toEqual(coalesceBounds('integer_range', bounds));
    }
  });

  it('merges IPv4 blocks at the mapped position with the IPv6 neighbourhood as coalesceBounds does', () => {
    const bounds = [
      bound('::ffff:0:0', '::ffff:255.255.255.254'),
      bound('255.255.255.255', '255.255.255.255'),
    ];
    expect(drain('ip_range', bounds)).toEqual(coalesceBounds('ip_range', bounds));
  });
});

describe('uncoveredInStreams', () => {
  const intervals = [bound('1', '20'), bound('30', '40'), bound('50', '60')];

  it('finds the sources no interval contains, counting them and keeping the first', async () => {
    const sources = [
      bound('1', '5'),
      bound('19', '21'),
      bound('30', '40'),
      bound('45', '47'),
      bound('55', '61'),
    ];
    const result = await uncoveredInStreams(
      'integer_range',
      streamOf(sources),
      streamOf(intervals)
    );
    expect(result).toEqual({ count: 3, first: bound('19', '21') });
  });

  it('reports nothing uncovered when every source sits inside an interval', async () => {
    const sources = [bound('1', '1'), bound('20', '20'), bound('31', '39'), bound('50', '60')];
    const result = await uncoveredInStreams(
      'integer_range',
      streamOf(sources),
      streamOf(intervals)
    );
    expect(result).toEqual({ count: 0, first: undefined });
  });

  it('treats every source as uncovered when there are no intervals', async () => {
    const result = await uncoveredInStreams(
      'integer_range',
      streamOf([bound('1', '2')]),
      streamOf([])
    );
    expect(result).toEqual({ count: 1, first: bound('1', '2') });
  });

  it('agrees with uncoveredBounds on many random inputs', async () => {
    for (let seed = 1; seed <= 100; seed++) {
      const sources = sortedIntegerBounds(seed, 30);
      const coalesced = coalesceBounds('integer_range', sortedIntegerBounds(seed + 1000, 15));
      const expected = uncoveredBounds('integer_range', coalesced, sources);
      const actual = await uncoveredInStreams(
        'integer_range',
        streamOf(sources),
        streamOf(coalesced)
      );
      expect(actual.count).toBe(expected.length);
      expect(actual.first).toEqual(expected[0]);
    }
  });
});

describe('date_range endpoints', () => {
  it('rejects an epoch the date grammar accepts but a JavaScript date cannot format', () => {
    // a valid `date` value, kept as digits, but the coalescer formats endpoints through `Date`
    expect(parseValueToBound('date_range', '9007199254740993')).toBeUndefined();
    // date ranges are written `start,end`
    expect(parseValueToBound('date_range', '1577836800000,1577836900000')).toEqual({
      range_end: '2020-01-01T00:01:40.000Z',
      range_start: '2020-01-01T00:00:00.000Z',
    });
  });
});
