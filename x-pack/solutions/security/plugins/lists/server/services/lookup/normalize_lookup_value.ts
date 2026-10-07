/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as ipaddr from 'ipaddr.js';
import moment from 'moment';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { DEFAULT_GEO_REGEX } from '../utils/transform_list_item_to_elastic_query';

import { isRangeType } from './build_lookup_mappings';

/**
 * The outcome of canonicalizing a value: its canonical spelling, or the reason the
 * spelling is not accepted. Only accepted spellings are ever written, so a document id
 * can never merge two values Elasticsearch keeps apart, or split one it merges.
 */
export type CanonicalResult = { ok: true; value: string } | { ok: false; reason: string };

const accept = (value: string): CanonicalResult => ({ ok: true, value });
const reject = (reason: string): CanonicalResult => ({ ok: false, reason });

// Four decimal octets, no leading zeros: the only IPv4 spelling Elasticsearch accepts.
const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}$`);
const IPV4_MAPPED = new RegExp(`^::ffff:(${IPV4_OCTET}(\\.${IPV4_OCTET}){3})$`, 'i');
const IPV6_GROUP = /^[0-9a-f]{1,4}$/i;

// A decimal with optional fraction and exponent.
const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;
const MAX_EXPONENT = 400;
const HALF_MAX = 65504;

const INTEGER_RANGE: Partial<Record<Type, { max: bigint; min: bigint }>> = {
  byte: { max: 127n, min: -128n },
  integer: { max: 2147483647n, min: -2147483648n },
  long: { max: 9223372036854775807n, min: -9223372036854775808n },
  short: { max: 32767n, min: -32768n },
};

// ISO 8601 calendar date with optional time, fraction (dot or comma), and offset.
const ISO_DATE =
  /^(\d{4}-\d{2}-\d{2})(?:T((?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d)(?:[.,](\d{1,9}))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/;
// Epoch milliseconds. Elasticsearch reads a shorter digit string as a year or as epoch
// milliseconds depending on its length, which no list author means, so it is rejected.
const EPOCH_MILLIS = /^-?\d{11,}$/;
// The widest epoch millisecond Elasticsearch stores on a `date` (a signed 64-bit number),
// on a `date_nanos` (nanoseconds in the same width, so 2262-04-11), and the widest a
// JavaScript `Date` can represent (year 275760).
const EPOCH_MILLIS_MAX = 9223372036854775807n;
const DATE_NANOS_MILLIS_MAX = 9223372036854n;
const DATE_MAX_MILLIS = 8640000000000000n;

/**
 * `ip`: dotted IPv4, or IPv6 in hex groups, or an IPv4-mapped IPv6 address in either
 * spelling (`::ffff:1.2.3.4`, `::ffff:102:304`), which Elasticsearch stores as IPv4.
 * Rejected on purpose: zone ids (`fe80::1%eth0`, which Elasticsearch strips), any other
 * dotted IPv6 form (`::1.2.3.4`, which `ipaddr.js` reads as IPv4 and Elasticsearch as
 * `::102:304`), and IPv4 spellings with leading zeros or fewer than four octets, which
 * Elasticsearch rejects and `ipaddr.js` would rewrite.
 */
const canonicalIp = (value: string): CanonicalResult => {
  if (IPV4.test(value)) return accept(value);
  if (!value.includes(':')) return reject(`"${value}" is not an IP address`);
  if (value.includes('%')) return reject(`"${value}" has a zone id, which is not stored`);
  if (value.includes('.')) {
    const mapped = IPV4_MAPPED.exec(value);
    return mapped != null
      ? accept(mapped[1])
      : reject(`"${value}" is not an IPv4-mapped IPv6 address of the form ::ffff:a.b.c.d`);
  }
  const groups = value.split(':').filter((group) => group !== '');
  if (!groups.every((group) => IPV6_GROUP.test(group)) || !ipaddr.IPv6.isValid(value)) {
    return reject(`"${value}" is not an IPv6 address`);
  }
  const parsed = ipaddr.IPv6.parse(value);
  return accept(
    parsed.isIPv4MappedAddress() ? parsed.toIPv4Address().toString() : parsed.toString()
  );
};

/**
 * Integer types: a decimal whose value is a whole number in the type's range. The
 * exponent is applied to the digits as text, so `long` keeps its full precision. A
 * spelling with a non-zero fraction is rejected rather than truncated: Elasticsearch
 * drops the fraction, but the smaller types pass through a double first, so a fraction
 * such as `.99999999999999999` rounds the value up before the truncation.
 */
const canonicalInteger = (type: Type, value: string): CanonicalResult => {
  const parsed = DECIMAL.exec(value);
  if (parsed == null) return reject(`"${value}" is not a number`);
  const [, sign, intDigits, fracDigits = '', exponent = '0'] = parsed;
  if (intDigits === '' && fracDigits === '') return reject(`"${value}" is not a number`);
  if (Math.abs(Number(exponent)) > MAX_EXPONENT) return reject(`"${value}" is out of range`);
  const shift = Number(exponent) - fracDigits.length;
  const allDigits = `${intDigits}${fracDigits}`;
  const integerDigits = shift >= 0 ? `${allDigits}${'0'.repeat(shift)}` : allDigits.slice(0, shift);
  const dropped = shift >= 0 ? '' : allDigits.slice(shift);
  if (/[1-9]/.test(dropped)) return reject(`"${value}" is not a whole number`);
  const magnitude = BigInt(integerDigits || '0');
  const signed = sign === '-' ? -magnitude : magnitude;
  const range = INTEGER_RANGE[type];
  if (range != null && (signed < range.min || signed > range.max)) {
    return reject(`"${value}" is out of range for ${type}`);
  }
  return accept(signed.toString());
};

// ---- exact decimal to binary floating point rounding ----

/** A decimal string as an exact rational `digits * 10^exponent`, sign separate. */
const decimalParts = (text: string): { digits: bigint; exponent: number; negative: boolean } => {
  const [, sign, intDigits, fracDigits = '', exponent = '0'] = DECIMAL.exec(text) ?? [];
  return {
    digits: BigInt(`${intDigits}${fracDigits}` || '0'),
    exponent: Number(exponent) - fracDigits.length,
    negative: sign === '-',
  };
};

const TWO_52 = 2n ** 52n;

/** A finite non-negative double as an exact rational `significand * 2^exponent`. */
const doubleParts = (value: number): { exponent: number; significand: bigint } => {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  const biasedExponent = Number((bits / TWO_52) % 2048n);
  const fraction = bits % TWO_52;
  return biasedExponent === 0
    ? { exponent: -1074, significand: fraction }
    : { exponent: biasedExponent - 1075, significand: fraction + TWO_52 };
};

/** Compare a non-negative decimal (`digits * 10^exponent`) with a non-negative double, exactly. */
const compareDecimalToDouble = (digits: bigint, exponent: number, value: number): number => {
  if (!Number.isFinite(value)) return value > 0 ? -1 : 1;
  const double = doubleParts(value);
  // scale both sides to integers: multiply by 10^-exponent and 2^-double.exponent as needed
  const left =
    digits * 10n ** BigInt(Math.max(exponent, 0)) * 2n ** BigInt(Math.max(-double.exponent, 0));
  const right =
    double.significand *
    2n ** BigInt(Math.max(double.exponent, 0)) *
    10n ** BigInt(Math.max(-exponent, 0));
  return left < right ? -1 : left > right ? 1 : 0;
};

const FLOAT_BITS = new Float32Array(1);
const FLOAT_UINT = new Uint32Array(FLOAT_BITS.buffer);
const FLOAT_SIGN = 2 ** 31;

/** The adjacent single precision value in `direction` (+1 up, -1 down), through the bit pattern. */
const adjacentFloat = (value: number, direction: 1 | -1): number => {
  FLOAT_BITS[0] = value;
  const [bits] = FLOAT_UINT;
  // map the sign-magnitude pattern onto a monotonic integer line, step, and map back
  const ordered = bits >= FLOAT_SIGN ? -(bits - FLOAT_SIGN) : bits;
  const stepped = ordered + direction;
  FLOAT_UINT[0] = stepped < 0 ? FLOAT_SIGN - stepped : stepped;
  return FLOAT_BITS[0];
};

const hasEvenSignificand = (value: number): boolean => {
  FLOAT_BITS[0] = value;
  return FLOAT_UINT[0] % 2 === 0;
};

/**
 * A non-negative decimal correctly rounded to single precision, ties to even, as Java's
 * `Float.parseFloat` rounds it. The float taken from the JavaScript double can be off by
 * one unit whenever the decimal lies within half a double unit of a float midpoint, so
 * the candidate is checked exactly against the midpoints to its neighbors. A float
 * midpoint is itself a double, so the comparison is exact.
 */
const parseSingleExact = (unsigned: string, digits: bigint, exponent: number): number => {
  const candidate = Math.fround(Number(unsigned));
  if (!Number.isFinite(candidate)) return candidate;
  const acrossMidpoint = (direction: 1 | -1): number | undefined => {
    const neighbor = adjacentFloat(candidate, direction);
    if (!Number.isFinite(neighbor) || neighbor < 0) return undefined;
    const midpoint = candidate / 2 + neighbor / 2;
    const order = compareDecimalToDouble(digits, exponent, midpoint) * direction;
    return order > 0 || (order === 0 && !hasEvenSignificand(candidate)) ? neighbor : undefined;
  };
  return acrossMidpoint(1) ?? acrossMidpoint(-1) ?? candidate;
};

/**
 * The decimal text correctly rounded to single or double precision, ties to even, as
 * Java's `Float.parseFloat` and `Double.parseDouble` round it. The JavaScript parse to
 * double is correctly rounded for any length; single precision goes through the exact
 * midpoint check. Returns NaN for text that is not a decimal; the sign of zero is kept.
 */
export const parseDecimalExact = (text: string, precision: 'single' | 'double'): number => {
  if (!DECIMAL.test(text) || !/\d/.test(text)) return NaN;
  const { digits, exponent, negative } = decimalParts(text);
  const unsigned = text.replace(/^[+-]/, '');
  const magnitude =
    precision === 'double' ? Number(unsigned) : parseSingleExact(unsigned, digits, exponent);
  return negative ? -magnitude : magnitude;
};

const roundHalfToEven = (quotient: number): number => {
  const floor = Math.floor(quotient);
  if (quotient - floor !== 0.5) return Math.round(quotient);
  return floor % 2 === 0 ? floor : floor + 1;
};

/** Round to the nearest IEEE half precision value (10 bit significand, subnormals below 2^-14). */
const halfRound = (value: number): number => {
  if (value === 0 || !Number.isFinite(value)) return value;
  const exponent = Math.max(Math.floor(Math.log2(Math.abs(value))), -14);
  const quantum = 2 ** (exponent - 10);
  return roundHalfToEven(value / quantum) * quantum;
};

/** The shortest spelling that reads back to the number; negative zero keeps its sign, as Elasticsearch keeps it apart from zero. */
const formatNumber = (value: number): string => (Object.is(value, -0) ? '-0' : String(value));

/**
 * Floating point types: the value as Elasticsearch stores it, printed in the shortest
 * form that reads back to the same number. Elasticsearch parses the text to a float
 * (or double) with correct rounding and, for `half_float`, rounds that float to half
 * precision; this does the same, with exact arithmetic rather than a double round trip.
 */
const canonicalFloat = (type: Type, value: string): CanonicalResult => {
  const parsed = parseDecimalExact(value, type === 'double' ? 'double' : 'single');
  if (Number.isNaN(parsed)) return reject(`"${value}" is not a number`);
  if (!Number.isFinite(parsed)) return reject(`"${value}" is out of range for ${type}`);
  if (type !== 'half_float') return accept(formatNumber(parsed));
  const half = halfRound(parsed);
  if (Math.abs(half) > HALF_MAX) return reject(`"${value}" is out of range for half_float`);
  return accept(formatNumber(half));
};

/**
 * Dates: an ISO 8601 calendar date, with optional time, fraction, and offset, or epoch
 * milliseconds. The canonical form is the UTC instant: `date` at millisecond precision,
 * `date_nanos` with the authored fraction (trailing zeros removed). A value without an
 * offset is UTC, as Elasticsearch reads it. Zone names, week and ordinal dates, a space
 * separator, and bare years are rejected rather than guessed.
 */
/**
 * Epoch milliseconds. Elasticsearch reads them as a signed 64-bit number; `date_nanos`
 * holds nanoseconds in the same width, so its span ends in 2262. JavaScript dates stop
 * far earlier (year 275760), so an instant beyond them is kept as its normalized digits,
 * the one spelling Elasticsearch stores for it.
 */
const canonicalEpoch = (type: Type, value: string): CanonicalResult => {
  const millis = BigInt(value);
  const max = type === 'date' ? EPOCH_MILLIS_MAX : DATE_NANOS_MILLIS_MAX;
  if (millis > max || millis < -max) return reject(`"${value}" is out of range for ${type}`);
  if (millis > DATE_MAX_MILLIS || millis < -DATE_MAX_MILLIS) return accept(millis.toString());
  const instant = moment.utc(Number(millis));
  if (!instant.isValid()) return reject(`"${value}" is not a date`);
  if (type === 'date') return accept(instant.toISOString());
  const [seconds, fraction] = instant.toISOString().replace(/Z$/, '').split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return accept(trimmed === '' ? `${seconds}Z` : `${seconds}.${trimmed}Z`);
};

const canonicalDate = (type: Type, value: string): CanonicalResult => {
  if (EPOCH_MILLIS.test(value)) return canonicalEpoch(type, value);
  const parsed = ISO_DATE.exec(value);
  if (parsed == null) return reject(`"${value}" is not an ISO 8601 date or epoch milliseconds`);
  const [, day, hourMinute, second, fraction = '', offset = ''] = parsed;
  const normalizedOffset =
    offset === '' || offset === 'Z'
      ? offset
      : `${offset.slice(0, 3)}:${offset.replace(':', '').slice(3) || '00'}`;
  if (normalizedOffset !== '' && normalizedOffset !== 'Z') {
    // Elasticsearch accepts offsets up to eighteen hours either way
    const [hours, minutes] = normalizedOffset.slice(1).split(':').map(Number);
    if (hours * 60 + minutes > 18 * 60) return reject(`"${value}" has an offset beyond 18:00`);
  }
  const time =
    hourMinute == null
      ? ''
      : `T${hourMinute}:${second ?? '00'}${fraction === '' ? '' : `.${fraction}`}`;
  const instant = moment.utc(`${day}${time}${normalizedOffset}`, moment.ISO_8601, true);
  if (!instant.isValid()) return reject(`"${value}" is not a valid date`);
  if (type === 'date') return accept(instant.toISOString());
  const seconds = instant.toISOString().replace(/\.\d{3}Z$/, '');
  const trimmedFraction = fraction.replace(/0+$/, '');
  return accept(trimmedFraction === '' ? `${seconds}Z` : `${seconds}.${trimmedFraction}Z`);
};

/**
 * A geo value in the spelling a read returns. The shared serializer stores `lat,lon` on a
 * `geo_point` as an object, rendered back as `lat,lon` with each part trimmed, and on a
 * shape type as the WKT string `POINT (lon lat)`, returned as stored. Any other spelling
 * is WKT and is stored and returned trimmed. Hashing that spelling keeps the id of an
 * item read back equal to the id it was written under.
 */
const canonicalGeo = (
  type: 'geo_point' | 'geo_shape' | 'shape',
  value: string
): CanonicalResult => {
  const parsed = DEFAULT_GEO_REGEX.exec(value);
  const lat = parsed?.groups?.lat?.trim();
  const lon = parsed?.groups?.lon?.trim();
  if (lat == null || lon == null) return accept(value);
  return accept(type === 'geo_point' ? `${lat},${lon}` : `POINT (${lon} ${lat})`);
};

/**
 * The canonical spelling of a value under its list type: the value as Elasticsearch
 * stores it, so every accepted spelling of one stored value hashes to one document id
 * and `LOOKUP JOIN` returns one row per value. A spelling outside the accepted grammar
 * is rejected, and the write refuses it, rather than guessed. Range and geo values are
 * accepted trimmed and as authored: the range parser validates ranges separately, the
 * join reads the coalesced intervals rather than the sources, and geo is not joinable.
 */
export const canonicalLookupValue = (type: Type, value: string): CanonicalResult => {
  const trimmed = value.trim();
  if (trimmed === '') return reject('the value is empty');
  if (isRangeType(type)) {
    return accept(trimmed);
  }
  if (type === 'geo_point' || type === 'geo_shape' || type === 'shape') {
    return canonicalGeo(type, trimmed);
  }
  if (/[\r\n]/.test(trimmed)) return reject('the value contains a line break');
  switch (type) {
    case 'ip':
      return canonicalIp(trimmed);
    case 'boolean':
      return trimmed === 'true' || trimmed === 'false'
        ? accept(trimmed)
        : reject(`"${trimmed}" is not true or false`);
    case 'byte':
    case 'short':
    case 'integer':
    case 'long':
      return canonicalInteger(type, trimmed);
    case 'half_float':
    case 'float':
    case 'double':
      return canonicalFloat(type, trimmed);
    case 'date':
    case 'date_nanos':
      return canonicalDate(type, trimmed);
    default:
      return accept(trimmed);
  }
};

/**
 * The form of a value that its document id hashes: the canonical spelling when the
 * value is accepted, else the trimmed authored spelling. A rejected value is never
 * written, so the fallback only serves lookups and deletes of values that do not exist.
 */
export const normalizeLookupValue = (type: Type, value: string): string => {
  const result = canonicalLookupValue(type, value);
  return result.ok ? result.value : value.trim();
};
