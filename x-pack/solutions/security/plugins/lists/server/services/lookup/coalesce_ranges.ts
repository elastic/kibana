/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-list-types';

/**
 * POC range coalescing. Parses authored range items into numeric bounds, merges
 * overlapping intervals into disjoint ones, and formats the bounds back to
 * strings for storage. Overlap-only merge (adjacent-interval merge is a later
 * optimization); the result is disjoint, which is what guarantees one match per
 * value in the join.
 */

export interface CoalescedBound {
  range_start: string;
  range_end: string;
}

// A comparable bound: bigint for ip, number for numeric/date (ms).
type Num = bigint | number;

interface Interval {
  start: Num;
  end: Num;
  v6?: boolean; // ip only, to format back correctly
}

const cmp = (a: Num, b: Num): number => (a < b ? -1 : a > b ? 1 : 0);

// ---- ip <-> bigint (v4 and v6) ----

const ipToBig = (ip: string): { n: bigint; v6: boolean } => {
  const trimmed = ip.trim();
  if (trimmed.includes(':')) {
    const [head, tail] = trimmed.split('::');
    const headParts = head ? head.split(':') : [];
    const tailParts = tail ? tail.split(':') : [];
    const missing = 8 - headParts.length - tailParts.length;
    const hextets = [...headParts, ...new Array(Math.max(missing, 0)).fill('0'), ...tailParts];
    // arithmetic instead of bitwise (no-bitwise lint rule): a<<16 | h === a*65536 + h
    let n = 0n;
    for (const h of hextets) {
      n = n * 65536n + BigInt(parseInt(h || '0', 16));
    }
    return { n, v6: true };
  }
  const parts = trimmed.split('.').map((p) => BigInt(p));
  const n = parts.reduce((acc, p) => acc * 256n + p, 0n);
  return { n, v6: false };
};

const bigToIp = (n: bigint, v6: boolean): string => {
  // n >> (unit*i) & mask === (n / unit**i) % (mask+1)
  if (v6) {
    const hextets: string[] = [];
    for (let i = 7; i >= 0; i--) {
      hextets.push(((n / 65536n ** BigInt(i)) % 65536n).toString(16));
    }
    return hextets.join(':');
  }
  const octets: string[] = [];
  for (let i = 3; i >= 0; i--) {
    octets.push(((n / 256n ** BigInt(i)) % 256n).toString());
  }
  return octets.join('.');
};

const cidrToInterval = (cidr: string): Interval => {
  const [base, prefixStr] = cidr.split('/');
  const { n, v6 } = ipToBig(base);
  const bits = v6 ? 128n : 32n;
  const prefix = BigInt(prefixStr);
  const hostBits = bits - prefix;
  const hostSize = 2n ** hostBits; // number of addresses in the block
  const network = (n / hostSize) * hostSize; // clear the host bits
  const broadcast = network + hostSize - 1n; // set the host bits
  return { end: broadcast, start: network, v6 };
};

// ---- per-type codec ----

interface RangeCodec {
  parse: (value: string) => Interval;
  format: (iv: Interval) => CoalescedBound;
}

const ipCodec: RangeCodec = {
  format: (iv: Interval): CoalescedBound => ({
    range_end: bigToIp(iv.end as bigint, iv.v6 ?? false),
    range_start: bigToIp(iv.start as bigint, iv.v6 ?? false),
  }),
  parse: (value: string): Interval => {
    const v = value.trim();
    if (v.includes('/')) return cidrToInterval(v);
    if (v.includes('-')) {
      const [a, b] = v.split('-');
      const start = ipToBig(a);
      const end = ipToBig(b);
      return { end: end.n, start: start.n, v6: start.v6 };
    }
    const single = ipToBig(v);
    return { end: single.n, start: single.n, v6: single.v6 };
  },
};

const numericCodec: RangeCodec = {
  format: (iv: Interval): CoalescedBound => ({
    range_end: String(iv.end),
    range_start: String(iv.start),
  }),
  parse: (value: string): Interval => {
    const v = value.trim();
    // split on the first hyphen that is not a leading sign
    const idx = v.indexOf('-', v.startsWith('-') ? 1 : 0);
    if (idx > 0) {
      return { end: Number(v.slice(idx + 1)), start: Number(v.slice(0, idx)) };
    }
    const n = Number(v);
    return { end: n, start: n };
  },
};

const dateCodec: RangeCodec = {
  format: (iv: Interval): CoalescedBound => ({
    range_end: new Date(iv.end as number).toISOString(),
    range_start: new Date(iv.start as number).toISOString(),
  }),
  parse: (value: string): Interval => {
    const v = value.trim();
    // date ranges are authored as "gte,lte" (matches the existing transform)
    if (v.includes(',')) {
      const [a, b] = v.split(',');
      return { end: Date.parse(b.trim()), start: Date.parse(a.trim()) };
    }
    const t = Date.parse(v);
    return { end: t, start: t };
  },
};

const codecForType = (type: Type): RangeCodec => {
  if (type === 'ip_range') return ipCodec;
  if (type === 'date_range') return dateCodec;
  return numericCodec; // integer_range, long_range, float_range, double_range
};

const coalesceIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = [...intervals].sort((x, y) => cmp(x.start, y.start));
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last != null && cmp(iv.start, last.end) <= 0) {
      if (cmp(iv.end, last.end) > 0) last.end = iv.end;
    } else {
      out.push({ ...iv });
    }
  }
  return out;
};

/**
 * Given a range list type and the set of authored range values (verbatim),
 * returns the disjoint coalesced bounds to store as the joinable documents.
 */
export const coalesceRangeValues = (type: Type, values: string[]): CoalescedBound[] => {
  const codec = codecForType(type);
  const intervals = values
    .map((value) => {
      try {
        return codec.parse(value);
      } catch {
        return undefined;
      }
    })
    .filter((iv): iv is Interval => iv != null && iv.start != null && iv.end != null);
  return coalesceIntervals(intervals).map((iv) => codec.format(iv));
};

// Parse the two endpoints of an already stored bound (plain values, never CIDR or
// dash), so a set of coalesced or source bounds can be re-coalesced without going
// back through the authored notation.
const boundToInterval = (type: Type, bound: CoalescedBound): Interval => {
  if (type === 'ip_range') {
    const start = ipToBig(bound.range_start);
    const end = ipToBig(bound.range_end);
    return { end: end.n, start: start.n, v6: start.v6 };
  }
  if (type === 'date_range') {
    return { end: Date.parse(bound.range_end), start: Date.parse(bound.range_start) };
  }
  return { end: Number(bound.range_end), start: Number(bound.range_start) };
};

/**
 * Parse one authored range value into its stored bounds, or undefined if it does
 * not parse. Used to stamp `src_start`/`src_end` on a source doc so ranges can be
 * range-queried for the localized insert and delete paths.
 */
export const parseValueToBound = (type: Type, value: string): CoalescedBound | undefined => {
  const codec = codecForType(type);
  try {
    const iv = codec.parse(value);
    if (iv == null || iv.start == null || iv.end == null) return undefined;
    return codec.format(iv);
  } catch {
    return undefined;
  }
};

/**
 * Coalesce a set of already parsed bounds into disjoint bounds. This is the
 * localized rebuild: the caller passes only the bounds in the affected window
 * (the coalesced intervals a new range touches, or the sources inside the
 * interval a delete fragments), not the whole list.
 */
export const coalesceBounds = (type: Type, bounds: CoalescedBound[]): CoalescedBound[] => {
  const codec = codecForType(type);
  const intervals = bounds
    .map((bound) => {
      try {
        return boundToInterval(type, bound);
      } catch {
        return undefined;
      }
    })
    .filter((iv): iv is Interval => iv != null && iv.start != null && iv.end != null);
  return coalesceIntervals(intervals).map((iv) => codec.format(iv));
};
