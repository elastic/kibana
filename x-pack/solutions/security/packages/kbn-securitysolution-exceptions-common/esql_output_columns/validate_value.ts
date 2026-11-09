/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlOutputColumnType } from './column_types';
import type { EsqlOutputColumnEntryType } from './entry_support';
import { isEntryTypeSupportedOnColumnType } from './entry_support';
import { isIP } from './ip';
import { toIpRange } from './ip_range';

export type IntegerColumnType = Extract<EsqlOutputColumnType, 'integer' | 'long' | 'unsigned_long'>;
export type DateColumnType = Extract<EsqlOutputColumnType, 'date' | 'date_nanos'>;

export const INTEGER_RANGES: Readonly<Record<IntegerColumnType, readonly [bigint, bigint]>> = {
  integer: [BigInt('-2147483648'), BigInt('2147483647')],
  long: [BigInt('-9223372036854775807'), BigInt('9223372036854775807')],
  unsigned_long: [BigInt(0), BigInt('18446744073709551615')],
};

// a number with more digits fails the whole query in ES|QL, instead of the cast returning null
const VERSION_PATTERN = /^\d{1,9}(\.\d{1,9}){0,2}([-+][0-9A-Za-z.-]+)?$/;
const DATE_PATTERN =
  /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?)?)?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/;
const OFFSET_PATTERN = /^([+-])(\d{2}):?(\d{2})?$/;
/** The largest offset that the DSL accepts is 18:00, as a Java zone offset is. */
const MAX_OFFSET_MINUTES = 18 * 60;

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** The last year that an ISO string writes with four digits: `toISOString` writes a longer year as `+010000`, which ES|QL does not read. */
const MAX_DATE_MS = Date.UTC(9999, 11, 31, 23, 59, 59, 999);
const NANOS_PER_MS = BigInt(1000000);
/** A `date_nanos` is a signed 64-bit number of nanoseconds since the epoch, and ES|QL does not accept one before 1970. */
const MAX_DATE_NANOS = BigInt('9223372036854775807');

/** An integer that fits the column type, or `undefined`. */
export const parseIntegerValue = (value: string, type: IntegerColumnType): bigint | undefined => {
  if (!/^[+-]?\d+$/.test(value)) {
    return undefined;
  }
  const [min, max] = INTEGER_RANGES[type];
  const parsed = BigInt(value);
  return parsed >= min && parsed <= max ? parsed : undefined;
};

export const isBooleanValue = (value: string): boolean => value === 'true' || value === 'false';

export const isIpValue = (value: string): boolean => isIP(value) !== 0;

/** An address, or a block of addresses in CIDR notation, which the compiler writes as the range from its first to its last address. */
export const isIpOrCidrValue = (value: string): boolean =>
  value.includes('/') ? toIpRange(value) !== undefined : isIpValue(value);

export const isVersionValue = (value: string): boolean => VERSION_PATTERN.test(value);

export interface ParsedDateValue {
  /** The first millisecond that the value matches, in UTC. */
  lowerMs: number;
  /** The length of the unit that the value writes (a day, an hour, a minute or a second), in milliseconds. */
  unitMs: number;
  /** The digits after the seconds, when the value has them. */
  fraction: string | undefined;
  /** Whether the value has an offset that is not `Z`. */
  hasOffset: boolean;
}

/** The offset of a date value in milliseconds, or `undefined` for an offset that the DSL does not accept. */
const toOffsetMs = (zone: string | undefined): number | undefined => {
  if (zone === undefined || zone === 'Z') {
    return 0;
  }
  const parts = OFFSET_PATTERN.exec(zone);
  if (parts == null) {
    return undefined;
  }
  const [, sign, hours, minutes = '00'] = parts;
  const total = Number(hours) * 60 + Number(minutes);
  if (Number(minutes) > 59 || total > MAX_OFFSET_MINUTES) {
    return undefined;
  }
  return (sign === '-' ? -1 : 1) * total * MS_PER_MINUTE;
};

/** Whether the instants that the value matches can be written for the type, as ES|QL reads them. */
const isWithinRange = (
  type: DateColumnType,
  lowerMs: number,
  unitMs: number,
  fraction: string | undefined
): boolean => {
  if (type === 'date') {
    // a fraction has at most 3 digits for a `date`
    const lastMs =
      fraction != null ? lowerMs + Number(fraction.padEnd(3, '0')) : lowerMs + unitMs - 1;
    return lowerMs <= MAX_DATE_MS && lastMs <= MAX_DATE_MS;
  }
  const lowerNanos = BigInt(lowerMs) * NANOS_PER_MS;
  const lastNanos =
    fraction != null
      ? lowerNanos + BigInt(fraction.padEnd(9, '0'))
      : BigInt(lowerMs + unitMs - 1) * NANOS_PER_MS + BigInt(999999);
  return lowerNanos >= BigInt(0) && lastNanos <= MAX_DATE_NANOS;
};

/** The digits after the seconds that a type can hold. */
const MAX_FRACTION_DIGITS: Readonly<Record<DateColumnType, number>> = { date: 3, date_nanos: 9 };

/**
 * The DSL fails on a zone with no time (`2026-10-01Z`), and on a `date_nanos` value with an hour or a minute and no
 * seconds. The compiler does not write them either.
 */
const isFormatAcceptedByDsl = (
  { zone, hour, second }: { zone?: string; hour?: string; second?: string },
  type: DateColumnType
): boolean =>
  (zone === undefined || hour !== undefined) &&
  !(type === 'date_nanos' && hour !== undefined && second === undefined);

/** The milliseconds since the epoch of the date and time that the value writes, or `undefined` when they are not a real date. */
const toLocalMs = ([year, month, day, hour, minute, second]: Array<string | undefined>):
  | number
  | undefined => {
  const [y, mo, d, h, mi, s] = [
    year,
    month ?? '1',
    day ?? '1',
    hour ?? '0',
    minute ?? '0',
    second ?? '0',
  ].map(Number);
  const localMs = Date.UTC(y, mo - 1, d, h, mi, s);
  const date = new Date(localMs);
  const isRealDate =
    y >= 1000 &&
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d &&
    h < 24 &&
    mi < 60 &&
    s < 60;
  return isRealDate ? localMs : undefined;
};

/** The length of the unit that the value writes: a day, an hour, a minute or a second. */
const getUnitMs = ({
  hour,
  minute,
  second,
}: {
  hour?: string;
  minute?: string;
  second?: string;
}): number => {
  if (second != null) {
    return MS_PER_SECOND;
  }
  if (minute != null) {
    return MS_PER_MINUTE;
  }
  return hour != null ? MS_PER_HOUR : MS_PER_DAY;
};

/**
 * Reads a date value the way the DSL does, or returns `undefined` when the DSL fails on it or when its instants
 * cannot be written for the type: a failed cast of a fractional value would become `null`, and the item would exclude every row.
 */
export const parseDateValue = (
  value: string,
  type: DateColumnType
): ParsedDateValue | undefined => {
  const match = DATE_PATTERN.exec(value);
  if (match == null) {
    return undefined;
  }
  const [, year, month, day, hour, minute, second, fraction, zone] = match;
  const offsetMs = toOffsetMs(zone);
  const localMs = toLocalMs([year, month, day, hour, minute, second]);
  if (
    offsetMs === undefined ||
    localMs === undefined ||
    !isFormatAcceptedByDsl({ hour, second, zone }, type) ||
    (fraction != null && fraction.length > MAX_FRACTION_DIGITS[type])
  ) {
    return undefined;
  }
  // The value is read in its own offset, and the DSL matches the unit that it writes in UTC.
  const lowerMs = localMs - offsetMs;
  const unitMs = getUnitMs({ hour, minute, second });
  if (!isWithinRange(type, lowerMs, unitMs, fraction)) {
    return undefined;
  }
  return {
    fraction,
    hasOffset: zone !== undefined && zone !== 'Z',
    lowerMs,
    unitMs,
  };
};

/**
 * The longest wildcard value that an item on output columns accepts. Elasticsearch compiles a `LIKE` pattern into an automaton,
 * and a very long pattern costs memory and time on every run of every rule that uses the item.
 */
export const MAX_WILDCARD_LENGTH = 1000;

/**
 * Turns a DSL wildcard value into an ES|QL `LIKE` pattern, or returns `undefined` for a value that ends in a lone `\` or is
 * longer than `MAX_WILDCARD_LENGTH`. Both treat `\` as the escape character.
 */
export const toLikePattern = (value: string): string | undefined => {
  if (value.length > MAX_WILDCARD_LENGTH) {
    return undefined;
  }
  let pattern = '';
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char !== '\\') {
      pattern += char;
    } else {
      const next = value[i + 1];
      if (next == null) {
        return undefined;
      }
      // `\*`, `\?` and `\\` stay escaped; the DSL reads an escaped ordinary character as the character itself.
      pattern += next === '*' || next === '?' || next === '\\' ? `\\${next}` : next;
      i++;
    }
  }
  return pattern;
};

/** Whether the value can be written for the column type, which a `double` or a `geo_point` column cannot. */
const isValueValidForColumnType = (value: string, columnType: EsqlOutputColumnType): boolean => {
  switch (columnType) {
    case 'keyword':
    case 'text':
      return true;
    case 'boolean':
      return isBooleanValue(value);
    case 'integer':
    case 'long':
    case 'unsigned_long':
      return parseIntegerValue(value, columnType) !== undefined;
    case 'ip':
      return isIpOrCidrValue(value);
    case 'version':
      return isVersionValue(value);
    case 'date':
    case 'date_nanos':
      return parseDateValue(value, columnType) !== undefined;
    default:
      // a `double` has no equality that is safe to write
      return false;
  }
};

/** Why an entry cannot be tested on a column of the type. The UI translates the problem, and `describeInvalidValueProblem` writes it in English. */
export type InvalidValueProblem =
  | {
      code: 'entry_type_not_supported_on_column_type';
      entryType: EsqlOutputColumnEntryType;
      columnType: EsqlOutputColumnType;
    }
  | { code: 'wildcard_too_long'; maxLength: number }
  | { code: 'wildcard_ends_with_backslash'; value: string }
  | { code: 'value_not_valid_for_column_type'; value: string; columnType: EsqlOutputColumnType };

/**
 * The problem of the value of an entry that cannot be tested on a column of the type, or `undefined` when it can: the entry type
 * is not supported on the type, or the value does not fit it.
 */
export const getInvalidValueProblem = ({
  entryType,
  columnType,
  value,
}: {
  entryType: EsqlOutputColumnEntryType;
  columnType: EsqlOutputColumnType;
  value: string;
}): InvalidValueProblem | undefined => {
  if (!isEntryTypeSupportedOnColumnType(entryType, columnType)) {
    return { code: 'entry_type_not_supported_on_column_type', entryType, columnType };
  }
  if (entryType === 'exists') {
    return undefined;
  }
  if (entryType === 'wildcard') {
    if (value.length > MAX_WILDCARD_LENGTH) {
      return { code: 'wildcard_too_long', maxLength: MAX_WILDCARD_LENGTH };
    }
    return toLikePattern(value) === undefined
      ? { code: 'wildcard_ends_with_backslash', value }
      : undefined;
  }
  return isValueValidForColumnType(value, columnType)
    ? undefined
    : { code: 'value_not_valid_for_column_type', value, columnType };
};

/** The problem in English, as the API returns it. */
export const describeInvalidValueProblem = (problem: InvalidValueProblem): string => {
  switch (problem.code) {
    case 'entry_type_not_supported_on_column_type':
      return `an entry of type "${problem.entryType}" is not supported on a column of type ${problem.columnType}`;
    case 'wildcard_too_long':
      return `a wildcard value cannot be longer than ${problem.maxLength} characters`;
    case 'wildcard_ends_with_backslash':
      return `value "${problem.value}" cannot end in a lone backslash`;
    case 'value_not_valid_for_column_type':
      return `value "${problem.value}" is not valid for a column of type ${problem.columnType}`;
  }
};

/** Why the value of an entry cannot be tested on a column of the type, in English, or `undefined` when it can. */
export const getInvalidValueReason = (args: {
  entryType: EsqlOutputColumnEntryType;
  columnType: EsqlOutputColumnType;
  value: string;
}): string | undefined => {
  const problem = getInvalidValueProblem(args);
  return problem === undefined ? undefined : describeInvalidValueProblem(problem);
};
