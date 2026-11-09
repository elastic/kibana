/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorEnum } from '@kbn/securitysolution-io-ts-list-types';

import { compileEndStageItem } from './build_end_stage_clause';
import type {
  ColumnTypeMismatch,
  OutputColumnType,
  OutputColumns,
  ResolveEndStageItemsResult,
  SkippedItem,
} from './types';
import { INVALID_ITEM_CODES, SkipReasonCode } from './types';

type ItemEntry = ExceptionListItemSchema['entries'][number];

/** The ES|QL type of a column that holds no value: `EVAL x = NULL` makes one. It behaves as a column that the query does not output. */
const NULL_COLUMN_TYPE = 'null';

/** An entry with an exclusive operator (`is not`, `does not exist`, ...): `excluded` is the operator that the lists API stores. */
const hasExclusiveOperator = (entry: ItemEntry): boolean =>
  'operator' in entry && entry.operator === ListOperatorEnum.EXCLUDED;

/** The column type that an entry declares, which entries of a type other than the ones of an item on the output columns do not have. */
const getDeclaredType = (entry: ItemEntry): string | undefined =>
  'column_type' in entry ? entry.column_type : undefined;

/** Writes each field name in double quotes, separated by commas: `a` and `b` give `"a", "b"`. */
const joinQuotedFields = (fields: readonly string[]): string =>
  fields.map((field) => `"${field}"`).join(', ');

/** The expression of a `WHERE` stage that keeps no row. */
const EXCLUDE_EVERY_ROW = 'false';

const NOTHING: ResolveEndStageItemsResult = {
  endStageItems: [],
  skippedItems: [],
  typeMismatches: [],
};

const resolveItem = (
  item: ExceptionListItemSchema,
  outputColumns: OutputColumns
): ResolveEndStageItemsResult => {
  const getActualType = (field: string): OutputColumnType | undefined => {
    const type = outputColumns.get(field);
    return type === NULL_COLUMN_TYPE ? undefined : type;
  };

  const neverMatches = [
    ...new Set(
      item.entries
        .filter((entry) => getActualType(entry.field) == null && !hasExclusiveOperator(entry))
        .map(({ field }) => field)
    ),
  ];
  if (neverMatches.length > 0) {
    const skipped: SkippedItem = {
      item,
      code: SkipReasonCode.FieldNotFound,
      explanation: `${joinQuotedFields(neverMatches)} is not in the output of the query`,
      fields: neverMatches,
    };
    return { ...NOTHING, skippedItems: [skipped] };
  }

  const entries = item.entries.filter((entry) => getActualType(entry.field) != null);

  // Every entry has an exclusive operator on a column that the query does not output, and each one is true for every row. The item then
  // excludes every row, as an item with such an entry alone does in the DSL filter on a field that exists nowhere.
  if (entries.length === 0 && item.entries.length > 0) {
    return {
      ...NOTHING,
      endStageItems: [{ item, clause: EXCLUDE_EVERY_ROW, terms: 1, excludesEveryRow: true }],
    };
  }

  // The values of the entries that are left come before the declared types: a value that cannot be written for its declared type
  // is not valid whatever the output of the query is.
  const compiled = compileEndStageItem({ ...item, entries });
  if (
    'skipReasons' in compiled &&
    compiled.skipReasons.some(({ code }) => INVALID_ITEM_CODES.has(code))
  ) {
    return {
      ...NOTHING,
      skippedItems: compiled.skipReasons.map((reason) => ({ item, ...reason })),
    };
  }

  const typeMismatches = entries.flatMap((entry): ColumnTypeMismatch[] => {
    const declaredType = getDeclaredType(entry);
    const actualType = getActualType(entry.field);
    return declaredType != null && actualType != null && declaredType !== actualType
      ? [{ item, field: entry.field, declaredType, actualType }]
      : [];
  });
  if (typeMismatches.length > 0) {
    return { ...NOTHING, typeMismatches };
  }

  return 'skipReasons' in compiled
    ? { ...NOTHING, skippedItems: compiled.skipReasons.map((reason) => ({ item, ...reason })) }
    : { ...NOTHING, endStageItems: [{ item, clause: compiled.clause, terms: compiled.terms }] };
};

/**
 * Compares each item on the output columns with the columns that the rule query outputs, and writes the items that can be
 * applied as clauses for the end of the query.
 *
 * A column that the query does not output has no values. An entry with an inclusive operator on it never matches, so the item excludes nothing
 * and is skipped. An entry with an exclusive operator on it is true for every row, so the clause leaves it out, and an item that has only such
 * entries is true for every row and excludes all of them, as the DSL filter does for a field that exists nowhere. An entry for a column that the
 * query outputs with another type than the entry declares is reported, because the clause would not run or would not test
 * what the user meant. The values of the entries that are left are checked before their declared types.
 */
export const resolveEndStageItems = ({
  items,
  outputColumns,
}: {
  items: readonly ExceptionListItemSchema[];
  outputColumns: OutputColumns;
}): ResolveEndStageItemsResult => {
  const resolved = items.map((item) => resolveItem(item, outputColumns));
  return {
    endStageItems: resolved.flatMap(({ endStageItems }) => endStageItems),
    skippedItems: resolved.flatMap(({ skippedItems }) => skippedItems),
    typeMismatches: resolved.flatMap(({ typeMismatches }) => typeMismatches),
  };
};
