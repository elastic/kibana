/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  wildcardToRegex,
  getFieldCategory,
  resolveInputToConcreteFields,
  type ResolvedValidField,
} from './get_field_values_handler';

describe('wildcardToRegex', () => {
  it('matches an exact field name with no wildcard', () => {
    const regex = wildcardToRegex('service.name');
    expect(regex.source).toBe('^service\\.name$');
    expect(regex.test('service.name')).toBe(true);
    expect(regex.test('service.names')).toBe(false);
    expect(regex.test('my.service.name')).toBe(false);
  });

  it('matches a trailing wildcard', () => {
    const regex = wildcardToRegex('host.*');
    expect(regex.source).toBe('^host\\..*$');
    expect(regex.test('host.name')).toBe(true);
    expect(regex.test('host.ip')).toBe(true);
    expect(regex.test('host.cpu.usage')).toBe(true);
    expect(regex.test('hostname')).toBe(false);
  });

  it('matches a mid-pattern wildcard', () => {
    const regex = wildcardToRegex('service.*.name');
    expect(regex.source).toBe('^service\\..*\\.name$');
    expect(regex.test('service.foo.name')).toBe(true);
    expect(regex.test('service.name')).toBe(false);
  });

  it('matches multiple wildcards', () => {
    const regex = wildcardToRegex('*.*');
    expect(regex.source).toBe('^.*\\..*$');
    expect(regex.test('a.b')).toBe(true);
    expect(regex.test('service.name')).toBe(true);
    expect(regex.test('a')).toBe(false);
  });

  it('escapes regex meta-characters in the pattern', () => {
    const regex = wildcardToRegex('a.b+c');
    expect(regex.source).toBe('^a\\.b\\+c$');
    expect(regex.test('a.b+c')).toBe(true);
    expect(regex.test('axb+c')).toBe(false);
    expect(regex.test('a.bbc')).toBe(false);
  });

  it('escapes backslashes in the pattern', () => {
    const regex = wildcardToRegex('a\\b');
    expect(regex.source).toBe('^a\\\\b$');
    expect(regex.test('a\\b')).toBe(true);
    expect(regex.test('ab')).toBe(false);
  });
});

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
      const result = resolveInputToConcreteFields('host.*', allFieldNames, fieldNameToTypeMap);

      expect(result).toEqual([
        { field: 'host.name', fieldType: 'keyword', category: 'keyword' },
        { field: 'host.ip', fieldType: 'ip', category: 'keyword' },
      ]);
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
