/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIP } from 'net';
import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { OutputColumns } from './types';

type Entry = EntriesArray[number];
/** `fullText` is set when the clause uses a full-text function, which ES|QL only accepts at some positions of a query. */
type Compiled = { clause: string; fullText?: true } | { reason: string };
/** `predicate` is true for the rows the entry matches. `excluded` entries (is not, does not exist, ...) negate it. */
type CompiledEntry = { predicate: string; negated?: boolean; fullText?: true } | { reason: string };

/** Longest `is one of` list that is written as a chain of comparisons (ES|QL limits the depth of an expression). */
export const MAX_MATCH_ANY_VALUES = 250;

/**
 * ES|QL column types on which an exception can be tested after the query pipeline has run. A `text` column is
 * compared with `MATCH_PHRASE`, as the DSL does, and does not support `matches`.
 */
export const END_STAGE_COLUMN_TYPES: ReadonlySet<string> = new Set([
  'keyword',
  'text',
  'integer',
  'long',
  'unsigned_long',
  'double',
  'boolean',
  'ip',
  'version',
  'date',
  'date_nanos',
]);

const DATE_TYPES: ReadonlySet<string> = new Set(['date', 'date_nanos']);

const INTEGER_RANGES: Readonly<Record<string, readonly [bigint, bigint]>> = {
  integer: [BigInt('-2147483648'), BigInt('2147483647')],
  long: [BigInt('-9223372036854775807'), BigInt('9223372036854775807')],
  unsigned_long: [BigInt(0), BigInt('18446744073709551615')],
};

const VERSION_PATTERN = /^\d+(\.\d+){0,2}([-+][0-9A-Za-z.-]+)?$/;
const DOUBLE_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const DATE_PATTERN =
  /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?)?)?)?(Z)?$/;
const SAFE_SEGMENT = /^[@a-zA-Z_][a-zA-Z0-9_]*$/;

const STRING_ESCAPES: Readonly<Record<string, string>> = {
  '\\': '\\\\',
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

const escapeEsqlString = (value: string): string =>
  value.replace(/[\\"\n\r\t]/g, (char) => STRING_ESCAPES[char] ?? char);

/** Quotes each dotted segment of a column name that is not a plain identifier. */
export const quoteColumn = (column: string): string =>
  column
    .split('.')
    .map((segment) => (SAFE_SEGMENT.test(segment) ? segment : `\`${segment.replace(/`/g, '``')}\``))
    .join('.');

const toIntegerLiteral = (value: string, type: string): string | undefined => {
  const range = INTEGER_RANGES[type];
  if (range == null || !/^[+-]?\d+$/.test(value)) {
    return undefined;
  }
  const [min, max] = range;
  const parsed = BigInt(value);
  return parsed >= min && parsed <= max ? `${parsed.toString()}::${type}` : undefined;
};

const toDoubleLiteral = (value: string): string | undefined => {
  if (!DOUBLE_PATTERN.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${String(parsed)}::double` : undefined;
};

/**
 * A literal for the column type, or `undefined` when the value does not parse as that type. A literal that
 * fails to cast becomes `null` in ES|QL, which would make the exception exclude every row, so values are
 * validated here instead.
 */
const toLiteral = (value: string, type: string): string | undefined => {
  switch (type) {
    case 'keyword':
      return `"${escapeEsqlString(value)}"`;
    case 'boolean': {
      const lowered = value.toLowerCase();
      return lowered === 'true' || lowered === 'false' ? lowered : undefined;
    }
    case 'integer':
    case 'long':
    case 'unsigned_long':
      return toIntegerLiteral(value, type);
    case 'double':
      return toDoubleLiteral(value);
    case 'ip':
      return isIP(value) !== 0 ? `"${value}"::ip` : undefined;
    case 'version':
      return VERSION_PATTERN.test(value) ? `"${value}"::version` : undefined;
    default:
      return undefined;
  }
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * The DSL rounds a date value to its unit: a day, hour, minute or second value covers that whole unit, a
 * month or year value covers only its first day, and a value with a fraction is an exact instant.
 */
const toDatePredicate = (column: string, value: string, type: string): CompiledEntry => {
  const match = DATE_PATTERN.exec(value);
  const invalid = { reason: `value "${value}" is not a supported ${type} format` };
  if (match == null) {
    return invalid;
  }
  const [, year, month, day, hour, minute, second, fraction] = match;
  const parts = [year, month ?? '1', day ?? '1', hour ?? '0', minute ?? '0', second ?? '0'].map(
    Number
  );
  const [y, mo, d, h, mi, s] = parts;
  const lowerMs = Date.UTC(y, mo - 1, d, h, mi, s);
  const roundTrips =
    y >= 1000 &&
    new Date(lowerMs).getUTCFullYear() === y &&
    new Date(lowerMs).getUTCMonth() === mo - 1 &&
    new Date(lowerMs).getUTCDate() === d &&
    h < 24 &&
    mi < 60 &&
    s < 60;
  if (!roundTrips) {
    return invalid;
  }

  if (fraction != null) {
    const maxDigits = type === 'date_nanos' ? 9 : 3;
    return fraction.length <= maxDigits
      ? { predicate: `MV_CONTAINS(${column}, "${value}"::${type})` }
      : invalid;
  }

  let unitMs = MS_PER_DAY;
  if (second != null) {
    unitMs = MS_PER_SECOND;
  } else if (minute != null) {
    unitMs = MS_PER_MINUTE;
  } else if (hour != null) {
    unitMs = MS_PER_HOUR;
  }
  const lower = new Date(lowerMs).toISOString();
  const lastInstant = new Date(lowerMs + unitMs - 1).toISOString();
  // MV_IN_RANGE includes both bounds, so the upper bound is the last instant of the unit.
  const upper = type === 'date_nanos' ? lastInstant.replace('Z', '999999Z') : lastInstant;
  return {
    predicate: `COALESCE(MV_IN_RANGE(${column}, "${lower}"::${type}, "${upper}"::${type}), false)`,
  };
};

/** Turns a DSL wildcard value into an ES|QL `LIKE` pattern. Both treat `\` as the escape character. */
const toLikePattern = (value: string): string | undefined => {
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

const isExcluded = (entry: Entry): boolean => 'operator' in entry && entry.operator === 'excluded';

const compileEntry = (entry: Entry, columns: OutputColumns): CompiledEntry => {
  if (
    entry.type !== 'match' &&
    entry.type !== 'match_any' &&
    entry.type !== 'exists' &&
    entry.type !== 'wildcard'
  ) {
    return { reason: `entries of type "${entry.type}" are not supported at the end of the query` };
  }
  const columnType = columns.get(entry.field);
  if (columnType == null || !END_STAGE_COLUMN_TYPES.has(columnType)) {
    return {
      reason: `column "${entry.field}" has type "${
        columnType ?? 'unknown'
      }", which cannot be tested at the end of the query`,
    };
  }
  const column = quoteColumn(entry.field);

  if (entry.type === 'exists') {
    return { predicate: `${column} IS NOT NULL`, negated: isExcluded(entry) };
  }

  if (columnType === 'text' && entry.type === 'wildcard') {
    return {
      reason: `"matches" with value "${entry.value}" is not supported on a text column: the DSL compares each analyzed token and ES|QL has no wildcard comparison by token at the end of the query`,
    };
  }

  if (entry.type === 'wildcard') {
    const pattern = columnType === 'keyword' ? toLikePattern(entry.value) : undefined;
    if (pattern == null) {
      return {
        reason: `"matches" with value "${entry.value}" is not supported on a ${columnType} column`,
      };
    }
    return {
      predicate: `COALESCE(MV_LIKE(${column}, "${escapeEsqlString(pattern)}"), false)`,
      negated: isExcluded(entry),
    };
  }

  const values = entry.type === 'match' ? [entry.value] : entry.value;
  if (values.length === 0 || values.length > MAX_MATCH_ANY_VALUES) {
    return { reason: `an "is one of" list must have between 1 and ${MAX_MATCH_ANY_VALUES} values` };
  }
  const predicates: string[] = [];
  for (const value of values) {
    if (columnType === 'text') {
      predicates.push(`MATCH_PHRASE(${column}, "${escapeEsqlString(value)}")`);
    } else if (DATE_TYPES.has(columnType)) {
      const date = toDatePredicate(column, value, columnType);
      if ('reason' in date) {
        return date;
      }
      predicates.push(date.predicate);
    } else {
      const literal = toLiteral(value, columnType);
      if (literal == null) {
        return { reason: `value "${value}" is not a valid ${columnType}` };
      }
      predicates.push(`MV_CONTAINS(${column}, ${literal})`);
    }
  }
  return {
    predicate: predicates.join(' OR '),
    negated: isExcluded(entry),
    ...(columnType === 'text' ? { fullText: true as const } : {}),
  };
};

/**
 * Compiles an exception item into the expression of a `WHERE` stage that keeps the rows the item does not exclude.
 */
export const compileEndStageItem = (
  item: ExceptionListItemSchema,
  columns: OutputColumns
): Compiled => {
  const entries: Array<{ predicate: string; negated?: boolean; fullText?: true }> = [];
  for (const entry of item.entries) {
    const compiled = compileEntry(entry, columns);
    if ('reason' in compiled) {
      return compiled;
    }
    entries.push(compiled);
  }
  if (entries.length === 0) {
    return { reason: 'the item has no entries' };
  }
  const fullText = entries.some((entry) => entry.fullText) ? { fullText: true as const } : {};
  if (entries.length === 1) {
    const [{ predicate, negated }] = entries;
    return { clause: negated ? predicate : `NOT (${predicate})`, ...fullText };
  }
  const excluded = entries
    .map(({ predicate, negated }) => `(${negated ? `NOT (${predicate})` : predicate})`)
    .join(' AND ');
  return { clause: `NOT (${excluded})`, ...fullText };
};

/** One `WHERE` stage per item: `NOT A AND NOT B` is `NOT (A OR B)` without a deep expression. */
export const toEndStageQuerySuffix = (clauses: readonly string[]): string =>
  clauses.map((clause) => ` | WHERE ${clause}`).join('');
