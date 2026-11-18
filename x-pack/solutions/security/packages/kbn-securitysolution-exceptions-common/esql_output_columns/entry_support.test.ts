/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_OUTPUT_COLUMN_TYPES, isEsqlOutputColumnType } from './column_types';
import type { EsqlOutputColumnType } from './column_types';
import {
  DEFAULT_EXCEPTION_APPLIES_TO,
  EXCEPTION_APPLIES_TO,
  getExceptionAppliesTo,
  isEsqlOutputColumnsItem,
} from './applies_to';
import {
  ESQL_OUTPUT_COLUMN_ENTRY_TYPES,
  getColumnTypesSupportedByEntryType,
  isEntryTypeSupportedOnColumnType,
  isEsqlOutputColumnEntryType,
} from './entry_support';

describe('column types', () => {
  it('lists the 11 types that the end of the query can test', () => {
    expect(ESQL_OUTPUT_COLUMN_TYPES).toHaveLength(11);
  });

  it.each([...ESQL_OUTPUT_COLUMN_TYPES])('recognizes %s', (type) => {
    expect(isEsqlOutputColumnType(type)).toBe(true);
  });

  it.each(['geo_point', 'unsupported', 'object', 'Keyword', '', 1, null, undefined])(
    'does not recognize %p',
    (type) => {
      expect(isEsqlOutputColumnType(type)).toBe(false);
    }
  );
});

describe('applies_to', () => {
  it('defaults to the source documents', () => {
    expect(DEFAULT_EXCEPTION_APPLIES_TO).toBe('source_documents');
    expect(getExceptionAppliesTo({})).toBe('source_documents');
    expect(getExceptionAppliesTo({ applies_to: null })).toBe('source_documents');
    expect(isEsqlOutputColumnsItem({})).toBe(false);
  });

  it('recognizes an item that applies to the ES|QL output columns', () => {
    const item = { applies_to: EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS };
    expect(getExceptionAppliesTo(item)).toBe('esql_output_columns');
    expect(isEsqlOutputColumnsItem(item)).toBe(true);
  });
});

describe('isEntryTypeSupportedOnColumnType', () => {
  const supportedTypes = (entryType: (typeof ESQL_OUTPUT_COLUMN_ENTRY_TYPES)[number]) =>
    ESQL_OUTPUT_COLUMN_TYPES.filter((columnType: EsqlOutputColumnType) =>
      isEntryTypeSupportedOnColumnType(entryType, columnType)
    );

  it('supports exists on every type', () => {
    expect(supportedTypes('exists')).toEqual([...ESQL_OUTPUT_COLUMN_TYPES]);
  });

  it('supports match and match_any on every type but double', () => {
    const expected = ESQL_OUTPUT_COLUMN_TYPES.filter((type) => type !== 'double');
    expect(supportedTypes('match')).toEqual(expected);
    expect(supportedTypes('match_any')).toEqual(expected);
  });

  it('supports a wildcard on keyword and text only', () => {
    expect(supportedTypes('wildcard')).toEqual(['keyword', 'text']);
  });

  it('only accepts match, match_any, wildcard and exists entries', () => {
    expect([...ESQL_OUTPUT_COLUMN_ENTRY_TYPES]).toEqual([
      'match',
      'match_any',
      'wildcard',
      'exists',
    ]);
    expect(isEsqlOutputColumnEntryType('list')).toBe(false);
    expect(isEsqlOutputColumnEntryType('nested')).toBe(false);
    expect(isEsqlOutputColumnEntryType(undefined)).toBe(false);
  });
});

describe('getColumnTypesSupportedByEntryType', () => {
  it('lists every type for exists', () => {
    expect(getColumnTypesSupportedByEntryType('exists')).toEqual([...ESQL_OUTPUT_COLUMN_TYPES]);
  });

  it('lists the types of is and is one of, which are all but double', () => {
    const expected = ESQL_OUTPUT_COLUMN_TYPES.filter((type) => type !== 'double');
    expect(getColumnTypesSupportedByEntryType('match')).toEqual(expected);
    expect(getColumnTypesSupportedByEntryType('match_any')).toEqual(expected);
  });

  it('lists only keyword and text for matches', () => {
    expect(getColumnTypesSupportedByEntryType('wildcard')).toEqual(['keyword', 'text']);
  });

  it.each([...ESQL_OUTPUT_COLUMN_ENTRY_TYPES])(
    'agrees with isEntryTypeSupportedOnColumnType for %s',
    (entryType) => {
      for (const columnType of ESQL_OUTPUT_COLUMN_TYPES) {
        expect(getColumnTypesSupportedByEntryType(entryType).includes(columnType)).toBe(
          isEntryTypeSupportedOnColumnType(entryType, columnType)
        );
      }
    }
  );
});
