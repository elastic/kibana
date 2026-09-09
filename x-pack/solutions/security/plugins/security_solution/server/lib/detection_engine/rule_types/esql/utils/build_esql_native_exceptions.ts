/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC: compile detection exception items directly into an ES|QL query.
 *
 * Exceptions are compiled as pipeline stages appended AFTER the rule's own
 * pipeline, so they can reference the query's OUTPUT columns, the computed /
 * aggregated `STATS ... BY` columns included, not just source fields. This is what
 * lets ES|QL rules (including aggregating ones) be "whitelisted" on the fields that
 * actually appear in the alert.
 *
 * Because the stages run after the pipeline, an exception can only be inlined if
 * every field it references is present in the query's output schema. The caller
 * resolves that schema (name + type) with a `LIMIT 0` probe and passes it in.
 *
 * Supported: match / match_any / exists / wildcard / list (value list), included
 * and excluded, on any output column.
 *
 * NOT inlineable (reported back to the caller, not applied):
 * - nested entries (no native ES|QL representation),
 * - any entry whose field is absent from the query output (e.g. a source field
 *   that is not a `STATS ... BY` key / aggregate on an aggregating rule, or a field
 *   dropped by `KEEP`/`DROP`),
 * - multi-value fields are a known correctness caveat: `==`/`IN`/`LOOKUP JOIN ON`
 *   do not match multi-value fields element-wise (would need `MV_EXPAND`); the
 *   compiler cannot detect multi-value-ness from the schema, so it does not report
 *   these per-item.
 */

import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Deterministic lookup index name for a value list id. Shared with the POC
 * setup script so the exception `list.id` resolves to the same index.
 */
export const lookupIndexNameForList = (listId: string): string =>
  `poc_vl_${listId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

// ES|QL numeric column types (unquoted literals). Everything else is quoted;
// booleans are emitted unquoted true/false.
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

const escapeString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const toEsqlLiteral = (value: string, esqlType: string | undefined): string => {
  if (esqlType === 'unsigned_long') {
    // unsigned_long does not implicitly compare with an integer/long literal; cast it.
    return `${value}::unsigned_long`;
  }
  if (esqlType && NUMERIC_ESQL_TYPES.has(esqlType)) {
    return value; // unquoted numeric literal
  }
  if (esqlType === 'boolean') {
    return value.toLowerCase() === 'true' ? 'true' : 'false';
  }
  return `"${escapeString(value)}"`;
};

interface ScalarEntry {
  field: string;
  type: 'match' | 'match_any' | 'exists' | 'wildcard';
  operator: 'included' | 'excluded';
  value?: string | string[];
}

const buildScalarCondition = (
  entry: ScalarEntry,
  columnTypes: Record<string, string | undefined>
): string => {
  const { field, type, operator } = entry;
  const esqlType = columnTypes[field];
  const negate = operator === 'excluded';

  switch (type) {
    case 'match': {
      const literal = toEsqlLiteral(String(entry.value), esqlType);
      return negate ? `${field} != ${literal}` : `${field} == ${literal}`;
    }
    case 'match_any': {
      const values = Array.isArray(entry.value) ? entry.value : [];
      const literals = values.map((v) => toEsqlLiteral(v, esqlType)).join(', ');
      const base = `${field} IN (${literals})`;
      return negate ? `NOT (${base})` : base;
    }
    case 'exists': {
      return negate ? `${field} IS NULL` : `${field} IS NOT NULL`;
    }
    case 'wildcard': {
      const base = `${field} LIKE "${escapeString(String(entry.value))}"`;
      return negate ? `NOT (${base})` : base;
    }
    default:
      return 'false';
  }
};

const fieldOfEntry = (entry: EntriesArray[number]): string | undefined =>
  'field' in entry ? entry.field : undefined;

export interface SkippedException {
  itemId: string;
  reason: string;
}

export interface NativeExceptionPipeline {
  /** ES|QL stages to append to the rule query (empty string if nothing inlined). */
  pipeline: string;
  /** Items that could not be inlined, with the reason (for reporting/warnings). */
  skipped: SkippedException[];
}

/**
 * All fields referenced by an item's entries (used to test inlineability against
 * the query output schema).
 */
const itemFields = (item: ExceptionListItemSchema): string[] =>
  (item.entries as EntriesArray).map(fieldOfEntry).filter((f): f is string => f != null);

/**
 * Build the ES|QL stages that apply the given exception items as an exclusion,
 * appended after the rule pipeline.
 *
 * @param items exception items to apply
 * @param availableColumns the query's output column names (from a LIMIT 0 probe)
 * @param columnTypes the query's output column name -> ES|QL type
 */
export const buildNativeEsqlExceptionPipeline = (
  items: ExceptionListItemSchema[],
  availableColumns: Set<string>,
  columnTypes: Record<string, string | undefined>
): NativeExceptionPipeline => {
  const skipped: SkippedException[] = [];
  if (!items.length) {
    return { pipeline: '', skipped };
  }

  const joinLines: string[] = [];
  const dropColumns: string[] = [];
  const itemConditions: string[] = [];
  let markerIndex = 0;

  for (const item of items) {
    const entries = item.entries as EntriesArray;
    const missingField = itemFields(item).find((f) => !availableColumns.has(f));

    if (!entries.length) {
      // nothing to apply
    } else if (entries.some((entry) => entry.type === 'nested')) {
      skipped.push({ itemId: item.item_id, reason: 'nested entries have no native ES|QL path' });
    } else if (missingField) {
      skipped.push({
        itemId: item.item_id,
        reason: `field "${missingField}" is not in the query output (cannot be referenced after the pipeline)`,
      });
    } else {
      const entryConditions: string[] = [];
      for (const entry of entries) {
        if (entry.type === 'list') {
          const idx = markerIndex++;
          const marker = `__exc_m${idx}`;
          const lookupIndex = lookupIndexNameForList(entry.list.id);
          const field = entry.field;
          const isRange = entry.list.type.endsWith('_range');

          if (isRange) {
            joinLines.push(
              `| LOOKUP JOIN ${lookupIndex} ON ${field} >= vl_start AND ${field} <= vl_end`
            );
            joinLines.push(
              `| RENAME vl_mark AS ${marker}, vl_start AS __exc_s${idx}, vl_end AS __exc_e${idx}`
            );
            dropColumns.push(marker, `__exc_s${idx}`, `__exc_e${idx}`);
          } else {
            joinLines.push(`| LOOKUP JOIN ${lookupIndex} ON ${field} == vl_value`);
            joinLines.push(`| RENAME vl_mark AS ${marker}, vl_value AS __exc_v${idx}`);
            dropColumns.push(marker, `__exc_v${idx}`);
          }
          entryConditions.push(
            entry.operator === 'excluded' ? `${marker} IS NULL` : `${marker} IS NOT NULL`
          );
        } else {
          entryConditions.push(buildScalarCondition(entry as ScalarEntry, columnTypes));
        }
      }

      if (entryConditions.length) {
        itemConditions.push(`(${entryConditions.join(' AND ')})`);
      }
    }
  }

  if (!itemConditions.length) {
    return { pipeline: '', skipped };
  }

  const stages: string[] = [...joinLines];
  // COALESCE the OR to false so a condition on a field that is absent (null) in a
  // document is treated as "not matched", matching V1 / Lucene two-valued semantics.
  // Without this, ES|QL three-valued logic makes `WHERE NOT (... null ...)` drop rows
  // whose exception fields are absent (the OR evaluates to null, and NOT null is
  // null, which WHERE excludes).
  stages.push(`| WHERE NOT COALESCE(${itemConditions.join(' OR ')}, false)`);
  if (dropColumns.length) {
    stages.push(`| DROP ${dropColumns.join(', ')}`);
  }

  return { pipeline: `\n${stages.join('\n')}`, skipped };
};
