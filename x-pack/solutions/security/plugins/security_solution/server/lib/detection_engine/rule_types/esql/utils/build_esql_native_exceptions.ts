/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC: compile detection exception items directly into an ES|QL query.
 *
 * Each exception item is compiled into a `WHERE NOT (...)` stage and placed in one
 * of two positions:
 *
 * - Early, right after the `FROM` source command, when every field the item
 *   references exists in the source indices. The exclusion then runs against the
 *   source documents, before the rule's own pipeline (event-level exclusion).
 * - Late, appended after the whole rule pipeline, when the item references a column
 *   the pipeline computes (a `STATS` output, an `EVAL` field, a rename). The
 *   exclusion then suppresses the resulting alert row (alert-level exclusion).
 *
 * The predicates reproduce the Lucene semantics of the current exception filter,
 * multi-valued fields included:
 * - match / match_any use `MV_CONTAINS` (any-element equality, and it returns a real
 *   boolean on null / absent / multi-valued fields, so no `COALESCE` is needed),
 * - exists uses `IS NULL` / `IS NOT NULL`,
 * - wildcard uses the full-text `QSTR` at the early position (Lucene any-element
 *   wildcard). Full-text functions cannot run after `STATS` / `EVAL`, so a wildcard
 *   that can only reference a computed column falls back to `LIKE` at the late
 *   position (a computed column is not multi-valued in practice).
 *
 * NOT inlineable (reported back to the caller, not applied here):
 * - value-list (`list`) entries: routed to the existing DSL implementation by the caller,
 * - nested entries (no native ES|QL representation),
 * - an entry whose field is in neither the source index nor the query output.
 */

import { Parser } from '@elastic/esql';
import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/** ES|QL numeric column types: the literal is cast to the exact column type. */
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
  'counter_long',
  'counter_integer',
  'counter_double',
]);

/** String-typed columns that take a bare quoted literal (no cast). */
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

const escapeString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Format a literal so it can be the second argument of `MV_CONTAINS`, which requires
 * the literal type to match the column type exactly.
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
  // ip, version, date, and similar: a quoted literal cast to the column type.
  return `"${escapeString(value)}"::${esqlType}`;
};

/** Escape a wildcard value for a `QSTR` query string, keeping `*` and `?` as wildcards. */
const escapeQueryStringValue = (value: string): string =>
  value
    .split('')
    .map((ch) => (ch === '*' || ch === '?' ? ch : QUERY_STRING_SPECIALS.has(ch) ? `\\${ch}` : ch))
    .join('');

interface ScalarEntry {
  field: string;
  type: 'match' | 'match_any' | 'exists' | 'wildcard';
  operator: 'included' | 'excluded';
  value?: string | string[];
}

/**
 * Compile one entry to a predicate that is `true` when the entry matches, reproducing
 * the Lucene any-element behavior. `isEarly` selects the wildcard strategy: `QSTR`
 * on the source (early), or a `LIKE` fallback after the pipeline (late).
 */
const buildEntryPredicate = (
  entry: ScalarEntry,
  columnTypes: Record<string, string | undefined>,
  isEarly: boolean
): string => {
  const { field, type, operator } = entry;
  const esqlType = columnTypes[field];
  const negate = operator === 'excluded';

  switch (type) {
    case 'match': {
      const base = `MV_CONTAINS(${field}, ${toMvContainsLiteral(String(entry.value), esqlType)})`;
      return negate ? `NOT ${base}` : base;
    }
    case 'match_any': {
      const values = Array.isArray(entry.value) ? entry.value : [];
      const contains = values.map(
        (v) => `MV_CONTAINS(${field}, ${toMvContainsLiteral(v, esqlType)})`
      );
      const base = contains.length === 1 ? contains[0] : `(${contains.join(' OR ')})`;
      return negate ? `NOT ${base}` : base;
    }
    case 'exists': {
      return negate ? `${field} IS NULL` : `${field} IS NOT NULL`;
    }
    case 'wildcard': {
      if (isEarly) {
        const queryString = `${field}:${escapeQueryStringValue(String(entry.value))}`;
        const base = `QSTR("${escapeString(queryString)}")`;
        return negate ? `NOT ${base}` : base;
      }
      // Late position: full-text is not allowed after STATS/EVAL. A computed column
      // is not multi-valued in practice, so LIKE is an acceptable fallback here.
      const base = `COALESCE(${field} LIKE "${escapeString(String(entry.value))}", false)`;
      return negate ? `NOT ${base}` : base;
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
    const entries = item.entries as EntriesArray;
    const fields = itemFields(item);

    if (!entries.length) {
      // nothing to apply
    } else if (entries.some((entry) => entry.type === 'nested')) {
      skipped.push({ itemId: item.item_id, reason: 'nested entries have no native ES|QL path' });
    } else if (entries.some((entry) => entry.type === 'list')) {
      // Defensive: value-list items are applied by the existing implementation.
      skipped.push({
        itemId: item.item_id,
        reason: 'value list exceptions are applied by the existing implementation',
      });
    } else if (fields.every((f) => source.columns.has(f))) {
      earlyConditions.push(buildItemCondition(item, source.columnTypes, true));
    } else if (fields.every((f) => output.columns.has(f))) {
      lateConditions.push(buildItemCondition(item, output.columnTypes, false));
    } else {
      const missing = fields.find((f) => !source.columns.has(f) && !output.columns.has(f));
      skipped.push({
        itemId: item.item_id,
        reason: `field "${missing}" is not in the source index or the query output`,
      });
    }
  }

  let result = query;

  if (earlyConditions.length) {
    const end = sourceCommandEnd(query);
    if (end == null) {
      // Cannot locate the source command, so the early stage has nowhere to go.
      for (const item of items) {
        if (itemFields(item).every((f) => source.columns.has(f)) && item.entries.length) {
          skipped.push({
            itemId: item.item_id,
            reason: 'could not locate the FROM command to place the exception',
          });
        }
      }
    } else {
      const stage = buildStage(earlyConditions);
      result = `${result.slice(0, end)}\n${stage}${result.slice(end)}`;
    }
  }

  if (lateConditions.length) {
    result = `${result}\n${buildStage(lateConditions)}`;
  }

  return { query: result, skipped };
};
