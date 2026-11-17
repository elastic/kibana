/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_OUTPUT_COLUMN_TYPES } from './column_types';
import type { EsqlOutputColumnType } from './column_types';

/** The entry types that an item that applies to ES|QL output columns can have: no value lists and no nested entries. */
export const ESQL_OUTPUT_COLUMN_ENTRY_TYPES = ['match', 'match_any', 'wildcard', 'exists'] as const;

export type EsqlOutputColumnEntryType = (typeof ESQL_OUTPUT_COLUMN_ENTRY_TYPES)[number];

const ENTRY_TYPES: ReadonlySet<string> = new Set(ESQL_OUTPUT_COLUMN_ENTRY_TYPES);

export const isEsqlOutputColumnEntryType = (type: unknown): type is EsqlOutputColumnEntryType =>
  typeof type === 'string' && ENTRY_TYPES.has(type);

/** `matches` (a wildcard) is written with `LIKE`, which only compares strings. */
const WILDCARD_COLUMN_TYPES: ReadonlySet<EsqlOutputColumnType> = new Set<EsqlOutputColumnType>([
  'keyword',
  'text',
]);

/**
 * Whether an entry type can be tested on a column of the type. `exists` works on every type. `double` has no
 * equality that is safe to write, and it only supports `exists`. A wildcard needs a string column.
 */
export const isEntryTypeSupportedOnColumnType = (
  entryType: EsqlOutputColumnEntryType,
  columnType: EsqlOutputColumnType
): boolean => {
  switch (entryType) {
    case 'exists':
      return true;
    case 'wildcard':
      return WILDCARD_COLUMN_TYPES.has(columnType);
    case 'match':
    case 'match_any':
      return columnType !== 'double';
  }
};

/** The column types that an entry type can test, in the order of `ESQL_OUTPUT_COLUMN_TYPES`. */
export const getColumnTypesSupportedByEntryType = (
  entryType: EsqlOutputColumnEntryType
): EsqlOutputColumnType[] =>
  ESQL_OUTPUT_COLUMN_TYPES.filter((columnType) =>
    isEntryTypeSupportedOnColumnType(entryType, columnType)
  );
