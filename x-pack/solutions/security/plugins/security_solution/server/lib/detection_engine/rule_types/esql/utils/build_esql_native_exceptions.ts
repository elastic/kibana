/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC: compile detection exception items directly into an ES|QL query.
 *
 * Each exception item is compiled into a `WHERE NOT (...)` stage and placed early
 * (right after `FROM`, for fields present in the source indices) or late (after the
 * pipeline, for computed columns). The predicates reproduce the Lucene semantics of
 * the current exception filter (`match` / `match_any` = `match_phrase`, `wildcard` =
 * a wildcard query), including any-element matching on multi-valued fields:
 *
 * - keyword / ip / numeric / boolean `match` / `match_any` use `MV_CONTAINS`
 *   (any-element equality; returns a real boolean on null / multi-valued fields),
 * - `text` `match` / `match_any` use the full-text `MATCH_PHRASE` at the early
 *   position (analyzed phrase matching, the same as `match_phrase`),
 * - `date` / `date_nanos` `match` / `match_any` use a half-open range so a
 *   day-granularity (or coarser) value rounds like a `match_phrase` term query; a
 *   full-precision value falls back to exact `MV_CONTAINS`,
 * - `exists` uses `IS NULL` / `IS NOT NULL`,
 * - `wildcard` uses the full-text `QSTR` at the early position, or `LIKE` at the late
 *   position (full-text cannot follow `STATS` / `EVAL`).
 *
 * Field names are quoted per path segment so custom fields (`host-name`, a leading
 * digit, and similar) compile. Columns whose ES|QL type the compiler cannot express
 * safely (a cross-index type conflict resolves to `unsupported`, `counter_*`,
 * `geo_*`, and the like) are reported, not compiled, so the query never fails to
 * parse.
 *
 * NOT inlineable (reported back to the caller, not applied here):
 * - value-list (`list`) entries: routed to the existing DSL implementation by the caller,
 * - nested entries (no native ES|QL representation),
 * - an entry whose field is in neither the source index nor the query output,
 * - an entry whose column type is not one the compiler can express.
 */

import { Parser } from '@elastic/esql';
import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/** Column types the compiler can express. Anything else is reported, not compiled. */
const SUPPORTED_ESQL_TYPES = new Set([
  'keyword',
  'text',
  'boolean',
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'ip',
  'version',
  'date',
  'date_nanos',
]);

/** Numeric types: the `MV_CONTAINS` literal is cast to the exact column type. */
const NUMERIC_ESQL_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
  'double',
  'float',
  'half_float',
  'scaled_float',
]);

const DATE_ESQL_TYPES = new Set(['date', 'date_nanos']);

/** String-typed columns whose `MV_CONTAINS` literal is a bare quoted string (no cast). */
const UNCAST_STRING_TYPES = new Set(['keyword', 'text']);

/** Query-string metacharacters escaped inside a `QSTR` clause (but not `*` / `?`). */
const QUERY_STRING_SPECIALS = new Set([
  '+',
  '-',
  '=',
  '&',
  '|',
  '>',
  '<',
  '!',
  '(',
  ')',
  '{',
  '}',
  '[',
  ']',
  '^',
  '"',
  '~',
  ':',
  '\\',
  '/',
  ' ',
  '\t',
  '\n',
  '\r',
]);

/** A path segment that can be written unquoted in ES|QL (allows a leading `@` for `@timestamp`). */
const SAFE_SEGMENT = /^[@a-zA-Z_][a-zA-Z0-9_]*$/;

const escapeString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** Backquote each dotted path segment that is not a plain identifier, e.g. `a.\`b-c\``. */
const quoteField = (field: string): string =>
  field
    .split('.')
    .map((segment) => (SAFE_SEGMENT.test(segment) ? segment : `\`${segment.replace(/`/g, '``')}\``))
    .join('.');

/** Escape a value for a `QSTR` query string, keeping `*` and `?` as wildcards. */
const escapeQueryStringValue = (value: string): string =>
  value
    .split('')
    .map((ch) => (ch === '*' || ch === '?' ? ch : QUERY_STRING_SPECIALS.has(ch) ? `\\${ch}` : ch))
    .join('');

/**
 * Format a literal so it can be the second argument of `MV_CONTAINS`, which requires
 * the literal type to match the column type exactly. (Date types are handled by a
 * range, not `MV_CONTAINS`.)
 */
const toMvContainsLiteral = (value: string, esqlType: string | undefined): string => {
  if (esqlType === 'boolean') {
    return value.toLowerCase() === 'true' ? 'true' : 'false';
  }
  if (esqlType && NUMERIC_ESQL_TYPES.has(esqlType)) {
    return `${value}::${esqlType}`;
  }
  if (esqlType == null || UNCAST_STRING_TYPES.has(esqlType)) {
    return `"${escapeString(value)}"`;
  }
  // ip, version, and similar: a quoted literal cast to the column type.
  return `"${escapeString(value)}"::${esqlType}`;
};

/**
 * Half-open [lower, upper) bounds that reproduce a `match_phrase` term query's date
 * rounding, or `undefined` when the value carries sub-second precision (an exact
 * instant, matched with `MV_CONTAINS`).
 */
const dateBounds = (value: string): { lower: string; upper: string } | undefined => {
  const match = value.match(
    /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:[T ](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?)?)?$/
  );
  if (match == null) {
    return undefined;
  }
  const [, year, month, day, hour, minute, second] = match;
  const y = Number(year);
  const mo = month != null ? Number(month) - 1 : 0;
  const d = day != null ? Number(day) : 1;
  const h = hour != null ? Number(hour) : 0;
  const mi = minute != null ? Number(minute) : 0;
  const s = second != null ? Number(second) : 0;
  const lowerMs = Date.UTC(y, mo, d, h, mi, s);
  let upperMs: number;
  if (second != null) upperMs = lowerMs + 1000;
  else if (minute != null) upperMs = lowerMs + 60 * 1000;
  else if (hour != null) upperMs = lowerMs + 60 * 60 * 1000;
  else if (day != null) upperMs = Date.UTC(y, mo, d + 1);
  else if (month != null) upperMs = Date.UTC(y, mo + 1, 1);
  else upperMs = Date.UTC(y + 1, 0, 1);
  return { lower: new Date(lowerMs).toISOString(), upper: new Date(upperMs).toISOString() };
};

interface ScalarEntry {
  field: string;
  type: 'match' | 'match_any' | 'exists' | 'wildcard';
  operator: 'included' | 'excluded';
  value?: string | string[];
}

/** The predicate that is `true` when a single value matches `field`, reproducing Lucene semantics. */
const matchOneValue = (
  quotedField: string,
  esqlType: string | undefined,
  value: string,
  isEarly: boolean
): string => {
  if (esqlType === 'text') {
    // Analyzed phrase matching. Full-text is valid only before STATS/EVAL; a computed
    // text column (late) is not Lucene-backed, so exact MV_CONTAINS is the fallback.
    return isEarly
      ? `MATCH_PHRASE(${quotedField}, "${escapeString(value)}")`
      : `MV_CONTAINS(${quotedField}, "${escapeString(value)}")`;
  }
  if (esqlType != null && DATE_ESQL_TYPES.has(esqlType)) {
    const bounds = dateBounds(value);
    if (bounds != null) {
      return `COALESCE((${quotedField} >= "${bounds.lower}"::${esqlType} AND ${quotedField} < "${bounds.upper}"::${esqlType}), false)`;
    }
    return `MV_CONTAINS(${quotedField}, "${escapeString(value)}"::${esqlType})`;
  }
  return `MV_CONTAINS(${quotedField}, ${toMvContainsLiteral(value, esqlType)})`;
};

/** Compile one entry to a predicate that is `true` when the entry matches. */
const buildEntryPredicate = (
  entry: ScalarEntry,
  columnTypes: Record<string, string | undefined>,
  isEarly: boolean
): string => {
  const { field, type, operator } = entry;
  const esqlType = columnTypes[field];
  const quotedField = quoteField(field);
  const negate = operator === 'excluded';
  const withNegation = (base: string): string => (negate ? `NOT ${base}` : base);

  switch (type) {
    case 'match': {
      return withNegation(matchOneValue(quotedField, esqlType, String(entry.value), isEarly));
    }
    case 'match_any': {
      const values = Array.isArray(entry.value) ? entry.value : [];
      const parts = values.map((v) => matchOneValue(quotedField, esqlType, v, isEarly));
      const base = parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
      return withNegation(base);
    }
    case 'exists': {
      return negate ? `${quotedField} IS NULL` : `${quotedField} IS NOT NULL`;
    }
    case 'wildcard': {
      if (isEarly) {
        const queryString = `${escapeQueryStringValue(field)}:${escapeQueryStringValue(
          String(entry.value)
        )}`;
        return withNegation(`QSTR("${escapeString(queryString)}")`);
      }
      // Late position: full-text is not allowed after STATS/EVAL. A computed column
      // is not multi-valued in practice, so LIKE is an acceptable fallback here.
      return withNegation(
        `COALESCE(${quotedField} LIKE "${escapeString(String(entry.value))}", false)`
      );
    }
    default:
      return 'false';
  }
};

const fieldOfEntry = (entry: EntriesArray[number]): string | undefined =>
  'field' in entry ? entry.field : undefined;

/** All fields an item's entries reference. */
const itemFields = (item: ExceptionListItemSchema): string[] =>
  (item.entries as EntriesArray).map(fieldOfEntry).filter((f): f is string => f != null);

/** Build one item's condition: its entries AND-ed together. */
const buildItemCondition = (
  item: ExceptionListItemSchema,
  columnTypes: Record<string, string | undefined>,
  isEarly: boolean
): string =>
  (item.entries as EntriesArray)
    .map((entry) => buildEntryPredicate(entry as ScalarEntry, columnTypes, isEarly))
    .join(' AND ');

/** Wrap a set of item conditions into a `| WHERE NOT (...)` exclusion stage. */
const buildStage = (itemConditions: string[]): string => {
  const inner =
    itemConditions.length === 1
      ? itemConditions[0]
      : itemConditions.map((condition) => `(${condition})`).join(' OR ');
  return `| WHERE NOT (${inner})`;
};

/** The character index just past the `FROM` source command, or undefined if not found. */
const sourceCommandEnd = (query: string): number | undefined => {
  try {
    const { root } = Parser.parse(query);
    const [first] = root.commands;
    if (first?.name !== 'from' || first.location == null) {
      return undefined;
    }
    return first.location.max + 1;
  } catch {
    return undefined;
  }
};

/**
 * The `FROM` source command of a query (for the source-schema probe), or undefined
 * if the query does not start with `FROM`.
 */
export const getFromClause = (query: string): string | undefined => {
  const end = sourceCommandEnd(query);
  return end == null ? undefined : query.slice(0, end).trim();
};

export interface SkippedException {
  itemId: string;
  reason: string;
}

export interface NativeExceptionQuery {
  /** The rule query with the exclusion stages inserted, or the original query if nothing was inlined. */
  query: string;
  /** Items that could not be inlined, with the reason (for reporting/warnings). */
  skipped: SkippedException[];
}

/** The columns available at a position, by name, with their ES|QL types. */
export interface PositionSchema {
  columns: Set<string>;
  columnTypes: Record<string, string | undefined>;
}

/** The first field on the item whose type the compiler cannot express, if any. */
const unsupportedField = (
  fields: string[],
  columnTypes: Record<string, string | undefined>
): { field: string; type: string | undefined } | undefined => {
  for (const field of fields) {
    const type = columnTypes[field];
    if (type == null || !SUPPORTED_ESQL_TYPES.has(type)) {
      return { field, type };
    }
  }
  return undefined;
};

type ItemOutcome =
  | { kind: 'ignore' }
  | { kind: 'skip'; reason: string }
  | { kind: 'inline'; position: 'early' | 'late'; condition: string };

/** Decide where (or whether) a single item is compiled. */
const classifyItem = (
  item: ExceptionListItemSchema,
  source: PositionSchema,
  output: PositionSchema
): ItemOutcome => {
  const entries = item.entries as EntriesArray;
  const fields = itemFields(item);

  if (!entries.length) {
    return { kind: 'ignore' };
  }
  if (entries.some((entry) => entry.type === 'nested')) {
    return { kind: 'skip', reason: 'nested entries have no native ES|QL path' };
  }
  if (entries.some((entry) => entry.type === 'list')) {
    // Defensive: value-list items are applied by the existing implementation.
    return {
      kind: 'skip',
      reason: 'value list exceptions are applied by the existing implementation',
    };
  }

  const isEarly = fields.every((f) => source.columns.has(f));
  const isLate = !isEarly && fields.every((f) => output.columns.has(f));
  if (!isEarly && !isLate) {
    const missing = fields.find((f) => !source.columns.has(f) && !output.columns.has(f));
    return {
      kind: 'skip',
      reason: `field "${missing}" is not in the source index or the query output`,
    };
  }

  const types = isEarly ? source.columnTypes : output.columnTypes;
  const unsupported = unsupportedField(fields, types);
  if (unsupported != null) {
    return {
      kind: 'skip',
      reason: `field "${unsupported.field}" has type "${
        unsupported.type ?? 'unknown'
      }", which native compilation does not support`,
    };
  }

  return {
    kind: 'inline',
    position: isEarly ? 'early' : 'late',
    condition: buildItemCondition(item, types, isEarly),
  };
};

/**
 * Take the rule query and return it with the given exception items applied as
 * exclusions. Items whose fields are all in the source indices are inlined early
 * (right after `FROM`); items that reference a computed column are appended late.
 * This is the query the ES|QL executor runs instead of the original. Value-list items
 * are expected to have been routed to the existing DSL implementation by the caller.
 *
 * @param query the rule query to modify
 * @param items exception items to apply (scalar entries only)
 * @param source columns present in the source indices (from a `FROM ... | LIMIT 0` probe)
 * @param output columns present in the query output (from a `<query> | LIMIT 0` probe)
 */
export const buildNativeEsqlExceptionQuery = ({
  query,
  items,
  source,
  output,
}: {
  query: string;
  items: ExceptionListItemSchema[];
  source: PositionSchema;
  output: PositionSchema;
}): NativeExceptionQuery => {
  const skipped: SkippedException[] = [];
  const earlyConditions: string[] = [];
  const lateConditions: string[] = [];

  for (const item of items) {
    const outcome = classifyItem(item, source, output);
    if (outcome.kind === 'skip') {
      skipped.push({ itemId: item.item_id, reason: outcome.reason });
    } else if (outcome.kind === 'inline') {
      (outcome.position === 'early' ? earlyConditions : lateConditions).push(outcome.condition);
    }
  }

  let result = query;

  if (earlyConditions.length) {
    const end = sourceCommandEnd(query);
    if (end == null) {
      for (const item of items) {
        if (item.entries.length && itemFields(item).every((f) => source.columns.has(f))) {
          skipped.push({
            itemId: item.item_id,
            reason: 'could not locate the FROM command to place the exception',
          });
        }
      }
    } else {
      result = `${result.slice(0, end)}\n${buildStage(earlyConditions)}${result.slice(end)}`;
    }
  }

  if (lateConditions.length) {
    result = `${result}\n${buildStage(lateConditions)}`;
  }

  return { query: result, skipped };
};
