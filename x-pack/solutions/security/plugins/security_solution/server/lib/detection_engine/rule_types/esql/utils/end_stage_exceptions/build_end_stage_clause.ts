/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIP } from 'net';
import type {
  EntriesArray,
  ExceptionListItemSchema,
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntryMatchWildcard,
} from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorEnum, ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { toIpRange } from './ip_range';
import type { EndStageColumnType, EndStageItem, OutputColumns, SkipReason } from './types';
import { SkipReasonCode, isEndStageColumnType } from './types';

type Entry = EntriesArray[number];
/** The reasons that an item or an entry cannot be written, one for each problem that was found. */
interface SkipResult {
  skipReasons: SkipReason[];
}
type Compiled = { clause: string; terms: number } | SkipResult;
/** `predicate` is true for the rows the entry matches. `excluded` entries (is not, does not exist, ...) negate it. */
type CompiledEntry = { predicate: string; terms: number; negated?: boolean } | SkipResult;

/** The result for an entry or an item that cannot be written, with the reason of each problem found. */
const toSkipResult = (...skipReasons: SkipReason[]): SkipResult => ({ skipReasons });

type IntegerColumnType = Extract<EndStageColumnType, 'integer' | 'long' | 'unsigned_long'>;

const DATE_TYPES: ReadonlySet<EndStageColumnType> = new Set<EndStageColumnType>([
  'date',
  'date_nanos',
]);

const INTEGER_RANGES: Readonly<Record<IntegerColumnType, readonly [bigint, bigint]>> = {
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
const SAFE_SEGMENT = /^[@a-zA-Z_][a-zA-Z0-9_]*$/;
/** Words that ES|QL does not accept as an unquoted column name, or reads as a literal. */
const RESERVED_WORDS: ReadonlySet<string> = new Set([
  'and',
  'asc',
  'by',
  'desc',
  'false',
  'first',
  'in',
  'is',
  'last',
  'like',
  'not',
  'null',
  'nulls',
  'on',
  'or',
  'rlike',
  'true',
  'where',
  'with',
]);

const STRING_ESCAPES: Readonly<Record<string, string>> = {
  '\\': '\\\\',
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

const escapeEsqlString = (value: string): string =>
  value.replace(/[\\"\n\r\t]/g, (char) => STRING_ESCAPES[char] ?? char);

/** Quotes each dotted segment of a column name that is not a plain identifier or is a reserved word, or the whole name when a segment is empty. */
export const quoteColumn = (column: string): string => {
  const segments = column.split('.');
  if (segments.some((segment) => segment === '')) {
    return `\`${column.replace(/`/g, '``')}\``;
  }
  return segments
    .map((segment) =>
      SAFE_SEGMENT.test(segment) && !RESERVED_WORDS.has(segment.toLowerCase())
        ? segment
        : `\`${segment.replace(/`/g, '``')}\``
    )
    .join('.');
};

const toIntegerLiteral = (value: string, type: IntegerColumnType): string | undefined => {
  if (!/^[+-]?\d+$/.test(value)) {
    return undefined;
  }
  const [min, max] = INTEGER_RANGES[type];
  const parsed = BigInt(value);
  return parsed >= min && parsed <= max ? `${parsed.toString()}::${type}` : undefined;
};

/** A literal for the column type, or `undefined` when the value does not parse as that type (a failed cast would become `null` and exclude every row). */
const toLiteral = (value: string, type: EndStageColumnType): string | undefined => {
  switch (type) {
    case 'keyword':
    case 'text':
      return `"${escapeEsqlString(value)}"`;
    case 'boolean':
      return value === 'true' || value === 'false' ? value : undefined;
    case 'integer':
    case 'long':
    case 'unsigned_long':
      return toIntegerLiteral(value, type);
    case 'ip':
      return isIP(value) !== 0 ? `"${value}"::ip` : undefined;
    case 'version':
      return VERSION_PATTERN.test(value) ? `"${value}"::version` : undefined;
    default:
      return undefined;
  }
};

/** The conversion that gives a list of strings the type of the column, since the list literal does not accept casts. */
const LIST_CONVERSIONS: Readonly<Partial<Record<EndStageColumnType, string>>> = {
  integer: 'TO_INTEGER',
  long: 'TO_LONG',
  unsigned_long: 'TO_UNSIGNED_LONG',
  ip: 'TO_IP',
  version: 'TO_VERSION',
};

/** The value as an element of a list: a string for the types that are converted, the literal for the others. */
const toListElement = (literal: string, type: EndStageColumnType): string => {
  if (type === 'keyword' || type === 'text' || type === 'boolean') {
    return literal;
  }
  const bare = literal.replace(/::\w+$/, '');
  return bare.startsWith('"') ? bare : `"${bare}"`;
};

const toListExpression = (elements: readonly string[], type: EndStageColumnType): string => {
  const list = `[${elements.join(', ')}]`;
  const conversion = LIST_CONVERSIONS[type];
  return conversion == null ? list : `${conversion}(${list})`;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const hasOffset = (zone: string | undefined): boolean => zone !== undefined && zone !== 'Z';

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

/** The predicate that matches a date value the way the DSL does, rounded to the unit that the value writes. */
const toDatePredicate = (
  column: string,
  value: string,
  type: EndStageColumnType
): { predicate: string } | SkipReason => {
  const match = DATE_PATTERN.exec(value);
  const invalid: SkipReason = {
    code: SkipReasonCode.ValueNotSupported,
    explanation: `value "${value}" cannot be written for a column of type ${type} because it is not in a supported format`,
  };
  if (match == null) {
    return invalid;
  }
  const [, year, month, day, hour, minute, second, fraction, zone] = match;
  const offsetMs = toOffsetMs(zone);
  if (offsetMs === undefined) {
    return invalid;
  }
  const parts = [year, month ?? '1', day ?? '1', hour ?? '0', minute ?? '0', second ?? '0'].map(
    Number
  );
  const [y, mo, d, h, mi, s] = parts;
  const localMs = Date.UTC(y, mo - 1, d, h, mi, s);
  // The value is read in its own offset, and the DSL matches the unit that it writes in UTC.
  const lowerMs = localMs - offsetMs;
  const roundTrips =
    y >= 1000 &&
    new Date(localMs).getUTCFullYear() === y &&
    new Date(localMs).getUTCMonth() === mo - 1 &&
    new Date(localMs).getUTCDate() === d &&
    h < 24 &&
    mi < 60 &&
    s < 60;
  // The DSL fails on a zone with no time (`2026-10-01Z`), and on a `date_nanos` value with an hour or a minute and
  // no seconds, so the executor does not write them either.
  const formatAcceptedByDsl =
    (zone === undefined || hour !== undefined) &&
    !(type === 'date_nanos' && hour !== undefined && second === undefined);
  if (!roundTrips || !formatAcceptedByDsl) {
    return invalid;
  }

  if (fraction != null) {
    const maxDigits = type === 'date_nanos' ? 9 : 3;
    if (fraction.length > maxDigits) {
      return invalid;
    }
    // A value with an offset is written in UTC, which is the instant that the DSL compares.
    const instant = hasOffset(zone)
      ? `${new Date(lowerMs).toISOString().slice(0, 19)}.${fraction}Z`
      : value;
    return { predicate: `MV_CONTAINS(${column}, "${instant}"::${type})` };
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

/** The value cannot be written for the column. The rule fails, because an item that is not applied lets alerts through. */
const toInvalidValueReason = (
  value: string,
  type: EndStageColumnType,
  field: string
): SkipReason => ({
  code: SkipReasonCode.ValueNotSupported,
  explanation: `value "${value}" cannot be written for a column of type ${type} at the end of the query`,
  fields: [field],
});

const isExcluded = (entry: Entry): boolean =>
  'operator' in entry && entry.operator === ListOperatorEnum.EXCLUDED;

type SupportedEntry = EntryMatch | EntryMatchAny | EntryMatchWildcard | EntryExists;

/** The entry types that can be tested at the end of the query. */
const SUPPORTED_ENTRY_TYPES: ReadonlySet<string> = new Set([
  ListOperatorTypeEnum.MATCH,
  ListOperatorTypeEnum.MATCH_ANY,
  ListOperatorTypeEnum.WILDCARD,
  ListOperatorTypeEnum.EXISTS,
]);

const isSupportedEntry = (entry: Entry): entry is SupportedEntry =>
  SUPPORTED_ENTRY_TYPES.has(entry.type);

const compileEntry = (entry: Entry, columns: OutputColumns): CompiledEntry => {
  if (!isSupportedEntry(entry)) {
    return toSkipResult({
      code: SkipReasonCode.EntryTypeNotSupported,
      explanation: `entries of type "${entry.type}" are not supported at the end of the query`,
      fields: [entry.field],
    });
  }
  const columnType = columns.get(entry.field);
  if (columnType == null || !isEndStageColumnType(columnType)) {
    return toSkipResult({
      code: SkipReasonCode.ColumnTypeNotSupported,
      explanation: `column "${entry.field}" has type "${
        columnType ?? 'unknown'
      }", which cannot be tested at the end of the query`,
      fields: [entry.field],
    });
  }
  const column = quoteColumn(entry.field);

  if (entry.type === ListOperatorTypeEnum.EXISTS) {
    return { predicate: `${column} IS NOT NULL`, terms: 1, negated: isExcluded(entry) };
  }

  if (entry.type === ListOperatorTypeEnum.WILDCARD) {
    if (columnType !== 'keyword' && columnType !== 'text') {
      return toSkipResult({
        code: SkipReasonCode.OperatorNotSupportedOnType,
        explanation: `"matches" with value "${entry.value}" is not supported on a ${columnType} column`,
        fields: [entry.field],
      });
    }
    const pattern = toLikePattern(entry.value);
    if (pattern == null) {
      return toSkipResult(toInvalidValueReason(entry.value, columnType, entry.field));
    }
    return {
      predicate: `COALESCE(MV_LIKE(${column}, "${escapeEsqlString(pattern)}"), false)`,
      terms: 1,
      negated: isExcluded(entry),
    };
  }

  if (columnType === 'double') {
    return toSkipResult({
      code: SkipReasonCode.OperatorNotSupportedOnType,
      explanation: `"${
        entry.type === ListOperatorTypeEnum.MATCH ? 'is' : 'is one of'
      }" is not supported on a double column: ES|QL reports float and half_float fields as double with the precision of the original type, so an equality can miss the value`,
      fields: [entry.field],
    });
  }

  const isList = entry.type === ListOperatorTypeEnum.MATCH_ANY;
  const values = entry.type === ListOperatorTypeEnum.MATCH_ANY ? entry.value : [entry.value];
  if (values.length === 0) {
    return toSkipResult({
      code: SkipReasonCode.ListSizeNotSupported,
      explanation: 'an "is one of" list must have at least one value',
      fields: [entry.field],
    });
  }
  const compileValue = (
    value: string
  ): { predicate: string } | { listElement: string } | SkipReason => {
    if (columnType === 'ip' && value.includes('/')) {
      const range = toIpRange(value);
      if (range == null) {
        return toInvalidValueReason(value, columnType, entry.field);
      }
      return {
        predicate: `COALESCE(MV_IN_RANGE(${column}, "${range.first}"::ip, "${range.last}"::ip), false)`,
      };
    }
    if (DATE_TYPES.has(columnType)) {
      const date = toDatePredicate(column, value, columnType);
      return 'explanation' in date ? { ...date, fields: [entry.field] } : date;
    }
    const literal = toLiteral(value, columnType);
    if (literal == null) {
      return toInvalidValueReason(value, columnType, entry.field);
    }
    return isList
      ? { listElement: toListElement(literal, columnType) }
      : { predicate: `MV_CONTAINS(${column}, ${literal})` };
  };

  const predicates: string[] = [];
  const listElements: string[] = [];
  const invalidValues: SkipReason[] = [];
  for (const value of values) {
    const compiled = compileValue(value);
    if ('explanation' in compiled) {
      invalidValues.push(compiled);
    } else if ('listElement' in compiled) {
      listElements.push(compiled.listElement);
    } else {
      predicates.push(compiled.predicate);
    }
  }
  // Every value that cannot be written is reported, not only the first.
  if (invalidValues.length > 0) {
    return toSkipResult(...invalidValues);
  }
  // One call tests the whole list, so the values of an "is one of" add one level to the expression, not one each.
  if (listElements.length > 0) {
    predicates.unshift(`MV_INTERSECTS(${column}, ${toListExpression(listElements, columnType)})`);
  }
  return {
    predicate: predicates.join(' OR '),
    terms: predicates.length,
    negated: isExcluded(entry),
  };
};

/**
 * Compiles an exception item into the expression of a `WHERE` stage that keeps the rows the item does not exclude.
 */
export const compileEndStageItem = (
  item: ExceptionListItemSchema,
  columns: OutputColumns
): Compiled => {
  if (item.os_types != null && item.os_types.length > 0) {
    return toSkipResult({
      code: SkipReasonCode.OsTypesNotSupported,
      explanation: `the item is restricted to the operating systems ${item.os_types.join(
        ', '
      )} (os_types), which only the DSL filter applies`,
      fields: [...new Set(item.entries.map(({ field }) => field))],
    });
  }
  const entries: Array<{ predicate: string; terms: number; negated?: boolean }> = [];
  const skipReasons: SkipReason[] = [];
  for (const entry of item.entries) {
    const compiled = compileEntry(entry, columns);
    if ('skipReasons' in compiled) {
      skipReasons.push(...compiled.skipReasons);
    } else {
      entries.push(compiled);
    }
  }
  if (skipReasons.length > 0) {
    return toSkipResult(...skipReasons);
  }
  if (entries.length === 0) {
    return toSkipResult({
      code: SkipReasonCode.ItemHasNoEntries,
      explanation: 'the item has no entries',
    });
  }
  const terms = entries.reduce((sum, entry) => sum + entry.terms, 0);
  if (entries.length === 1) {
    const [{ predicate, negated }] = entries;
    return { clause: negated ? predicate : `NOT (${predicate})`, terms };
  }
  const excluded = entries
    .map(({ predicate, negated }) => `(${negated ? `NOT (${predicate})` : predicate})`)
    .join(' AND ');
  return { clause: `NOT (${excluded})`, terms };
};

/** The most comparisons in the one `WHERE` stage, which keeps its depth and its clauses under the limits of Elasticsearch (see the proposal). */
export const MAX_COMPARISONS = 200;

/** ES|QL rejects a statement of more than 1,000,000 characters (`ESQL statement is too large`). The rule query counts. */
export const MAX_QUERY_LENGTH = 1000000;

/** The room that the final query keeps for the page size that the executor adds (` | limit 10000`). */
const PAGE_SIZE_LENGTH = 32;

/** What an item adds to the query besides its clause: the ` | WHERE `, the parentheses and the `AND`. */
const STAGE_OVERHEAD = 16;

/** How many of the items with the most comparisons the message names. */
const LARGEST_ITEMS_IN_REASON = 3;

/** The limit that the exceptions reach, and why. */
export interface EndStageLimit {
  limit: 'comparisons' | 'query_length';
  reason: string;
}

const describeItem = ({ item }: EndStageItem): string =>
  `the item "${item.name}" (list "${item.list_id}", item "${item.item_id}")`;

/** Writes the items as one `WHERE` stage on a new line, or reports the comparison or query length limit that they reach. */
export const toEndStageQuerySuffix = (
  items: readonly EndStageItem[],
  queryLength: number = 0
): { suffix: string } | { limit: EndStageLimit } => {
  if (items.length === 0) {
    return { suffix: '' };
  }

  const comparisons = items.reduce((sum, { terms }) => sum + terms, 0);
  if (comparisons > MAX_COMPARISONS) {
    const largest = [...items]
      .sort((a, b) => b.terms - a.terms)
      .slice(0, LARGEST_ITEMS_IN_REASON)
      .map((endStageItem) => `${describeItem(endStageItem)} has ${endStageItem.terms}`)
      .join(', ');
    return {
      limit: {
        limit: 'comparisons',
        reason: `the exceptions on the columns of the query need ${comparisons} comparisons, and at most ${MAX_COMPARISONS} are allowed (a comparison is one test on a column: an entry, or one CIDR value or date of an "is one of" entry). The items with the most comparisons are: ${largest}`,
      },
    };
  }

  let length = queryLength + PAGE_SIZE_LENGTH;
  for (const endStageItem of items) {
    length += endStageItem.clause.length + STAGE_OVERHEAD;
    if (length > MAX_QUERY_LENGTH) {
      return {
        limit: {
          limit: 'query_length',
          reason: `the query would be longer than ${MAX_QUERY_LENGTH} characters when ${describeItem(
            endStageItem
          )} is added`,
        },
      };
    }
  }

  const expression =
    items.length === 1 ? items[0].clause : items.map(({ clause }) => `(${clause})`).join(' AND ');
  return { suffix: `\n| WHERE ${expression}` };
};
