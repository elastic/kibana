/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { canonicalLookupValue } from './normalize_lookup_value';

/**
 * POC range coalescing. Parses authored range items into numeric bounds, merges
 * them into disjoint intervals, and formats the bounds back to strings for storage.
 * Overlapping intervals always merge. For the discrete types (ip, date, integer,
 * long) exactly adjacent intervals merge too, which compacts the coalesced set. The
 * result is disjoint, which is what guarantees one match per value in the join.
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

// Elasticsearch stores every address as 128 bits, with IPv4 at the IPv4-mapped position
// (`::ffff:a.b.c.d`), so both families share one number line and compare the way
// Elasticsearch compares them. IPv4 therefore lives in [MAPPED_BASE, MAPPED_END].
const IPV4_MAPPED_BASE = 0xffffn * 2n ** 32n;
const IPV4_MAPPED_END = IPV4_MAPPED_BASE + 2n ** 32n - 1n;
const IPV6_MAX = 2n ** 128n - 1n;

const ipToBig = (ip: string): { n: bigint; v6: boolean } => {
  // Only spellings Elasticsearch accepts, in the spelling it stores: `010.0.0.1`,
  // `1.2.3`, zone ids, and the IPv4-compatible form are rejected, and an IPv4-mapped
  // IPv6 address becomes its IPv4 form, as Elasticsearch stores it.
  const canonical = canonicalLookupValue('ip', ip);
  if (!canonical.ok) throw new Error(canonical.reason);
  const trimmed = canonical.value;
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
  return { n: IPV4_MAPPED_BASE + n, v6: false };
};

/** The stored spelling of a position on the number line: dotted IPv4 in the mapped range, hex groups elsewhere. */
const bigToIp = (n: bigint): string => {
  if (n < 0n || n > IPV6_MAX) throw new Error(`address ${n} is outside the IPv6 space`);
  // n >> (unit*i) & mask === (n / unit**i) % (mask+1)
  if (n >= IPV4_MAPPED_BASE && n <= IPV4_MAPPED_END) {
    const local = n - IPV4_MAPPED_BASE;
    const octets: string[] = [];
    for (let i = 3; i >= 0; i--) {
      octets.push(((local / 256n ** BigInt(i)) % 256n).toString());
    }
    return octets.join('.');
  }
  const hextets: string[] = [];
  for (let i = 7; i >= 0; i--) {
    hextets.push(((n / 65536n ** BigInt(i)) % 65536n).toString(16));
  }
  return hextets.join(':');
};

const cidrToInterval = (cidr: string): Interval => {
  const [base, prefixStr, ...rest] = cidr.split('/');
  const { n, v6 } = ipToBig(base);
  const bits = v6 ? 128n : 32n;
  if (rest.length > 0 || !/^\d{1,3}$/.test(prefixStr)) {
    throw new Error(`"${cidr}" is not a CIDR block`);
  }
  // Elasticsearch rejects CIDR notation on an IPv4-mapped IPv6 address, and the inline
  // exception filter sends authored values to it verbatim, so reject it here as well.
  if (!v6 && base.includes(':')) {
    throw new Error(`"${cidr}" uses CIDR notation on an IPv4-mapped address; write the IPv4 block`);
  }
  const prefix = BigInt(prefixStr);
  if (prefix > bits) {
    throw new Error(`"${cidr}" is not a CIDR block`);
  }
  const hostBits = bits - prefix;
  const hostSize = 2n ** hostBits; // number of addresses in the block
  // the block math runs on the family's own line; IPv4 is moved back to the mapped position
  const offset = v6 ? 0n : IPV4_MAPPED_BASE;
  const local = n - offset;
  const network = (local / hostSize) * hostSize; // clear the host bits
  const broadcast = network + hostSize - 1n; // set the host bits
  return { end: offset + broadcast, start: offset + network, v6 };
};

// ---- per-type codec ----

interface RangeCodec {
  parse: (value: string) => Interval;
  format: (iv: Interval) => CoalescedBound;
}

const ipCodec: RangeCodec = {
  format: (iv: Interval): CoalescedBound => ({
    range_end: bigToIp(iv.end as bigint),
    range_start: bigToIp(iv.start as bigint),
  }),
  parse: (value: string): Interval => {
    const v = value.trim();
    if (v.includes('/')) return cidrToInterval(v);
    if (v.includes('-')) {
      const [a, b, ...rest] = v.split('-');
      if (rest.length > 0) throw new Error(`"${v}" is not an IP range`);
      const start = ipToBig(a);
      const end = ipToBig(b);
      if (start.v6 !== end.v6 || start.n > end.n) throw new Error(`"${v}" is not an IP range`);
      return { end: end.n, start: start.n, v6: start.v6 };
    }
    const single = ipToBig(v);
    return { end: single.n, start: single.n, v6: single.v6 };
  },
};

/**
 * Split `start-end` on the separating dash: the first `-` that is neither a leading
 * sign nor an exponent sign (`1e-5-2` is `1e-5` to `2`; `-5--1` is `-5` to `-1`).
 */
const splitNumericRange = (value: string): [string, string] | undefined => {
  for (let i = 1; i < value.length; i++) {
    if (value[i] === '-' && !/[eE]/.test(value[i - 1])) {
      return [value.slice(0, i), value.slice(i + 1)];
    }
  }
  return undefined;
};

// An endpoint in the grammar of the bound type, so the stored range is the authored one:
// integer bounds keep full precision and a fractional endpoint is rejected rather than
// truncated by the mapper.
const parseEndpoint = (boundType: Type, text: string): Num => {
  const canonical = canonicalLookupValue(boundType, text);
  if (!canonical.ok) throw new Error(canonical.reason);
  return boundType === 'integer' || boundType === 'long'
    ? BigInt(canonical.value)
    : Number(canonical.value);
};

const numericCodec = (boundType: Type): RangeCodec => ({
  format: (iv: Interval): CoalescedBound => ({
    range_end: String(iv.end),
    range_start: String(iv.start),
  }),
  parse: (value: string): Interval => {
    const v = value.trim();
    const pair = splitNumericRange(v);
    if (pair != null) {
      const start = parseEndpoint(boundType, pair[0]);
      const end = parseEndpoint(boundType, pair[1]);
      if (cmp(start, end) > 0) throw new Error(`"${v}" is not a numeric range`);
      return { end, start };
    }
    const n = parseEndpoint(boundType, v);
    return { end: n, start: n };
  },
});

// A date endpoint in the `date` grammar (ISO 8601 or epoch milliseconds), as an instant.
const parseDate = (text: string): number => {
  const canonical = canonicalLookupValue('date', text);
  if (!canonical.ok) throw new Error(canonical.reason);
  const millis = Date.parse(canonical.value);
  // An epoch past the JavaScript date range is a valid `date` value (kept as digits) but
  // cannot be an endpoint here: the coalescer formats endpoints back through `Date`.
  if (Number.isNaN(millis)) {
    throw new Error(`"${text}" is beyond the range a date_range endpoint supports (year 275760)`);
  }
  return millis;
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
      // the separator is a comma followed by a date; a comma inside a fraction is not
      const parts = v.split(/,(?=\s*(?:\d{4}-|-?\d{11,}))/);
      if (parts.length !== 2) throw new Error(`"${v}" is not a date range`);
      const [a, b] = parts;
      const start = parseDate(a);
      const end = parseDate(b);
      if (start > end) throw new Error(`"${v}" is not a date range`);
      return { end, start };
    }
    const t = parseDate(v);
    return { end: t, start: t };
  },
};

const codecForType = (type: Type): RangeCodec => {
  if (type === 'ip_range') return ipCodec;
  if (type === 'date_range') return dateCodec;
  if (type === 'integer_range') return numericCodec('integer');
  if (type === 'long_range') return numericCodec('long');
  if (type === 'float_range') return numericCodec('float');
  return numericCodec('double');
};

// The next representable value after a discrete bound, so adjacent intervals can be
// detected (bigint for ip, number for integer/long/date in ms).
const nextValue = (end: Num): Num => (typeof end === 'bigint' ? end + 1n : end + 1);

// ip, date, integer, and long ranges are discrete, so intervals that are exactly
// adjacent merge as well as those that overlap. Float and double ranges are
// continuous, so only overlaps merge.
const DISCRETE_RANGE_TYPES: ReadonlySet<Type> = new Set([
  'date_range',
  'integer_range',
  'ip_range',
  'long_range',
]);
const isDiscreteRangeType = (type: Type): boolean => DISCRETE_RANGE_TYPES.has(type);

const coalesceIntervals = (intervals: Interval[], mergeAdjacent: boolean): Interval[] => {
  const sorted = [...intervals].sort((x, y) => cmp(x.start, y.start));
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    // Merge when the next interval overlaps the current one, and for discrete types
    // also when it is exactly adjacent (starts one step past the current end).
    const mergeUpTo = last != null && mergeAdjacent ? nextValue(last.end) : last?.end;
    if (last != null && mergeUpTo != null && cmp(iv.start, mergeUpTo) <= 0) {
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
  return coalesceIntervals(intervals, isDiscreteRangeType(type)).map((iv) => codec.format(iv));
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
  if (type === 'integer_range' || type === 'long_range') {
    return { end: BigInt(bound.range_end), start: BigInt(bound.range_start) };
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
  return coalesceIntervals(intervals, isDiscreteRangeType(type)).map((iv) => codec.format(iv));
};

// The representable extremes of each discrete bound type. A widened window is clamped
// to them, so a range at the top of its space never produces a bound Elasticsearch
// rejects (an integer above its maximum) or that wraps (2^128 formatted as `::`).
const DATE_MAX_MS = 8_640_000_000_000_000; // the largest instant a JavaScript Date represents
const BOUND_LIMITS: Partial<Record<Type, { max: Num; min: Num }>> = {
  date_range: { max: DATE_MAX_MS, min: -DATE_MAX_MS },
  integer_range: { max: 2147483647n, min: -2147483648n },
  ip_range: { max: IPV6_MAX, min: 0n },
  long_range: { max: 9223372036854775807n, min: -9223372036854775808n },
};

/**
 * Widen a bound by one representable step on each side for the discrete types, so a
 * region search built from it also captures exactly adjacent intervals (which do not
 * overlap and would otherwise land in a separate coalesce pass). Continuous types and
 * unparseable bounds are returned unchanged. Both edges are clamped to the type's
 * representable extremes.
 */
export const widenForAdjacency = (type: Type, bound: CoalescedBound): CoalescedBound => {
  if (!isDiscreteRangeType(type)) return bound;
  const codec = codecForType(type);
  let iv: Interval;
  try {
    iv = boundToInterval(type, bound);
  } catch {
    return bound;
  }
  const limits = BOUND_LIMITS[type];
  const stepDown = (value: Num): Num => (typeof value === 'bigint' ? value - 1n : value - 1);
  const start = limits != null && cmp(iv.start, limits.min) <= 0 ? iv.start : stepDown(iv.start);
  const end = limits != null && cmp(iv.end, limits.max) >= 0 ? iv.end : nextValue(iv.end);
  return codec.format({ ...iv, end, start });
};

/** Whether the bound `outer` contains every point of the bound `inner`. */
export const boundContains = (
  type: Type,
  outer: CoalescedBound,
  inner: CoalescedBound
): boolean => {
  const a = boundToInterval(type, outer);
  const b = boundToInterval(type, inner);
  return cmp(a.start, b.start) <= 0 && cmp(a.end, b.end) >= 0;
};

/**
 * The sources that no interval contains. Every bound is parsed once and the intervals
 * are sorted, so a source is checked against the one interval that can contain it (the
 * last one starting at or before it) by binary search: linear in the sources and
 * intervals after the sort, never a pass over every pair.
 */
export const uncoveredBounds = (
  type: Type,
  intervals: CoalescedBound[],
  sources: CoalescedBound[]
): CoalescedBound[] => {
  const sorted = intervals
    .map((bound) => boundToInterval(type, bound))
    .sort((a, b) => cmp(a.start, b.start));
  return sources.filter((source) => {
    const iv = boundToInterval(type, source);
    // the last interval whose start is at or before the source's start
    let low = 0;
    let high = sorted.length - 1;
    let candidate = -1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (cmp(sorted[mid].start, iv.start) <= 0) {
        candidate = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return candidate < 0 || cmp(sorted[candidate].end, iv.end) < 0;
  });
};

/**
 * An incremental coalescer: feed it bounds in ascending start order and it hands back
 * every interval it has finished, holding only the one still open. The streaming
 * counterpart of `coalesceBounds`, for a source set too large to hold in memory.
 */
export interface StreamingCoalescer {
  /** Add the next bound (start at or after every earlier one); returns finished intervals. */
  push: (bound: CoalescedBound) => CoalescedBound[];
  /** Close the open interval, if any, and return it. */
  flush: () => CoalescedBound[];
}

export const createStreamingCoalescer = (type: Type): StreamingCoalescer => {
  const codec = codecForType(type);
  const mergeAdjacent = isDiscreteRangeType(type);
  let open: Interval | undefined;
  return {
    flush: (): CoalescedBound[] => {
      const finished = open != null ? [codec.format(open)] : [];
      open = undefined;
      return finished;
    },
    push: (bound: CoalescedBound): CoalescedBound[] => {
      let iv: Interval;
      try {
        iv = boundToInterval(type, bound);
      } catch {
        return [];
      }
      if (open == null) {
        open = { ...iv };
        return [];
      }
      const mergeUpTo = mergeAdjacent ? nextValue(open.end) : open.end;
      if (cmp(iv.start, mergeUpTo) <= 0) {
        if (cmp(iv.end, open.end) > 0) open.end = iv.end;
        return [];
      }
      const finished = codec.format(open);
      open = { ...iv };
      return [finished];
    },
  };
};

/**
 * The streaming counterpart of `uncoveredBounds`: both inputs sorted by start, the
 * intervals disjoint. A source is checked against the one interval that can contain it,
 * the first whose end is not before the source's start, so both streams are read once
 * and nothing is held beyond the current interval. Returns how many sources no interval
 * contains, and the first of them.
 */
export const uncoveredInStreams = async (
  type: Type,
  sources: AsyncIterable<CoalescedBound>,
  intervals: AsyncIterable<CoalescedBound>
): Promise<{ count: number; first?: CoalescedBound }> => {
  const iterator = intervals[Symbol.asyncIterator]();
  let current: Interval | undefined;
  let exhausted = false;
  const advance = async (): Promise<void> => {
    const next = await iterator.next();
    if (next.done) {
      current = undefined;
      exhausted = true;
    } else {
      current = boundToInterval(type, next.value);
    }
  };
  let count = 0;
  let first: CoalescedBound | undefined;
  for await (const source of sources) {
    const iv = boundToInterval(type, source);
    if (current == null && !exhausted) await advance();
    while (current != null && cmp(current.end, iv.start) < 0) await advance();
    const covered =
      current != null && cmp(current.start, iv.start) <= 0 && cmp(current.end, iv.end) >= 0;
    if (!covered) {
      count += 1;
      if (first == null) first = source;
    }
  }
  return { count, first };
};
