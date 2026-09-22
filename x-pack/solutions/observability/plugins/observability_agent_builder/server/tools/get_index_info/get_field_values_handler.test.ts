/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFieldCategory,
  resolveInputToConcreteFields,
  type ResolvedValidField,
} from './get_field_values_handler';

describe('getFieldCategory', () => {
  it.each([
    ['keyword', 'keyword'],
    ['constant_keyword', 'keyword'],
    ['ip', 'keyword'],
    ['long', 'numeric'],
    ['integer', 'numeric'],
    ['short', 'numeric'],
    ['byte', 'numeric'],
    ['double', 'numeric'],
    ['float', 'numeric'],
    ['half_float', 'numeric'],
    ['scaled_float', 'numeric'],
    ['unsigned_long', 'numeric'],
    ['date', 'date'],
    ['date_nanos', 'date'],
    ['boolean', 'boolean'],
    ['text', 'text'],
    ['match_only_text', 'text'],
  ] as const)('maps "%s" to "%s"', (fieldType, expectedCategory) => {
    expect(getFieldCategory(fieldType)).toBe(expectedCategory);
  });

  it.each(['geo_point', 'flattened', 'object', 'nested', 'unknown_type'])(
    'returns "unsupported" for "%s"',
    (fieldType) => {
      expect(getFieldCategory(fieldType)).toBe('unsupported');
    }
  );
});

describe('resolveInputToConcreteFields', () => {
  const allFieldNames = [
    'service.name',
    'service.environment',
    'host.name',
    'host.ip',
    'host.os',
    '@timestamp',
  ];

  const fieldNameToTypeMap: Record<string, string | undefined> = {
    'service.name': 'keyword',
    'service.environment': 'keyword',
    'host.name': 'keyword',
    'host.ip': 'ip',
    'host.os': undefined,
    '@timestamp': 'date',
  };

  describe('literal field name', () => {
    it('returns a resolved field when the field exists', () => {
      const result = resolveInputToConcreteFields(
        'service.name',
        allFieldNames,
        fieldNameToTypeMap
      );

      expect(result).toEqual([
        { field: 'service.name', fieldType: 'keyword', category: 'keyword' },
      ]);
    });

    it('returns an error when the field does not exist', () => {
      const result = resolveInputToConcreteFields(
        'missing.field',
        allFieldNames,
        fieldNameToTypeMap
      );

      expect(result).toEqual([
        { input: 'missing.field', error: 'Field "missing.field" not found' },
      ]);
    });
  });

  describe('wildcard pattern', () => {
    it('matches multiple fields and returns their categories', () => {
      const result = resolveInputToConcreteFields(
        'host.*',
        allFieldNames,
        fieldNameToTypeMap
      ) as ResolvedValidField[];

      expect(result.map((r) => r.field)).toEqual(['host.name', 'host.ip']);
    });

    it('excludes fields with undefined type (object/nested)', () => {
      const result = resolveInputToConcreteFields('host.*', allFieldNames, fieldNameToTypeMap);

      const fieldNames = result
        .filter((r): r is ResolvedValidField => 'field' in r)
        .map((r) => r.field);

      expect(fieldNames).not.toContain('host.os');
    });

    it('returns an error when no fields match', () => {
      const result = resolveInputToConcreteFields(
        'nonexistent.*',
        allFieldNames,
        fieldNameToTypeMap
      );

      expect(result).toEqual([
        { input: 'nonexistent.*', error: 'No fields match pattern "nonexistent.*"' },
      ]);
    });

    it('matches across different field categories', () => {
      const result = resolveInputToConcreteFields('*', allFieldNames, fieldNameToTypeMap);

      const categories = result
        .filter((r): r is ResolvedValidField => 'field' in r)
        .map((r) => r.category);

      expect(categories).toContain('keyword');
      expect(categories).toContain('date');
    });
  });
});
