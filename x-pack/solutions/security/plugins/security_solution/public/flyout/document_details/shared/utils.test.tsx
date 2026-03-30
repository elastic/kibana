/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetFieldsData } from './hooks/use_get_fields_data';
import {
  getField,
  getFieldArray,
  isRiskSeverity,
  mergeLegacyIdentityWhenStoreEntityMissing,
  normalizeRiskLevel,
  resolveHostNameForEntityInsights,
  resolveUserNameForEntityInsights,
} from './utils';

describe('getField', () => {
  it('should return the string value if field is a string', () => {
    expect(getField('test string')).toBe('test string');
  });
  it('should return the first string value if field is a string array', () => {
    expect(getField(['string1', 'string2', 'string3'])).toBe('string1');
  });

  it('should return null if field is not string or string array', () => {
    expect(getField(100)).toBe(null);
    expect(getField([1, 2, 3])).toBe(null);
    expect(getField({ test: 'test string' })).toBe(null);
    expect(getField(null)).toBe(null);
  });

  it('should return fallback value if field is not string or string array and emptyValue is provided', () => {
    expect(getField(100, '-')).toBe('-');
    expect(getField([1, 2, 3], '-')).toBe('-');
    expect(getField({ test: 'test string' }, '-')).toBe('-');
    expect(getField(null, '-')).toBe('-');
  });
});

describe('getFieldArray', () => {
  it('should return the string value in an array if field is a string', () => {
    expect(getFieldArray('test string')).toStrictEqual(['test string']);
  });
  it('should return field array', () => {
    expect(getFieldArray(['string1', 'string2', 'string3'])).toStrictEqual([
      'string1',
      'string2',
      'string3',
    ]);
    expect(getFieldArray([1, 2, 3])).toStrictEqual([1, 2, 3]);
  });

  it('should return empty array if field is null or empty', () => {
    expect(getFieldArray(undefined)).toStrictEqual([]);
    expect(getFieldArray(null)).toStrictEqual([]);
  });
});

const emptyGetFieldsData: GetFieldsData = () => [];

describe('resolveUserNameForEntityInsights', () => {
  it('prefers user.name from document over user.id in identity map', () => {
    expect(
      resolveUserNameForEntityInsights({ 'user.id': 'id-1', 'entity.id': 'e-1' }, (field: string) =>
        field === 'user.name' ? ['alice'] : []
      )
    ).toBe('alice');
  });

  it('prefers user.name in identity map over user.id', () => {
    expect(
      resolveUserNameForEntityInsights(
        { 'user.id': 'id-1', 'user.name': 'bob' },
        emptyGetFieldsData
      )
    ).toBe('bob');
  });

  it('falls back to user.id when no name fields exist', () => {
    expect(resolveUserNameForEntityInsights({ 'user.id': 'uid-9' }, emptyGetFieldsData)).toBe(
      'uid-9'
    );
  });
});

describe('resolveHostNameForEntityInsights', () => {
  it('prefers host.name from document over host.id in identity map', () => {
    expect(
      resolveHostNameForEntityInsights({ 'host.id': 'h-1' }, (field: string) =>
        field === 'host.name' ? ['srv'] : []
      )
    ).toBe('srv');
  });

  it('falls back to host.id when no name fields exist', () => {
    expect(resolveHostNameForEntityInsights({ 'host.id': 'uuid-host' }, emptyGetFieldsData)).toBe(
      'uuid-host'
    );
  });
});

describe('isRiskSeverity', () => {
  it('returns true for valid severity values', () => {
    expect(isRiskSeverity('Unknown')).toBe(true);
    expect(isRiskSeverity('Low')).toBe(true);
    expect(isRiskSeverity('Moderate')).toBe(true);
    expect(isRiskSeverity('High')).toBe(true);
    expect(isRiskSeverity('Critical')).toBe(true);
  });

  it('returns false for unrecognised values', () => {
    expect(isRiskSeverity('critical')).toBe(false);
    expect(isRiskSeverity('CRITICAL')).toBe(false);
    expect(isRiskSeverity('')).toBe(false);
    expect(isRiskSeverity('invalid')).toBe(false);
  });
});

describe('normalizeRiskLevel', () => {
  it('returns null for empty or undefined input', () => {
    expect(normalizeRiskLevel(undefined)).toBeNull();
    expect(normalizeRiskLevel('')).toBeNull();
  });

  it('normalises lowercase input', () => {
    expect(normalizeRiskLevel('critical')).toBe('Critical');
    expect(normalizeRiskLevel('high')).toBe('High');
    expect(normalizeRiskLevel('moderate')).toBe('Moderate');
    expect(normalizeRiskLevel('low')).toBe('Low');
    expect(normalizeRiskLevel('unknown')).toBe('Unknown');
  });

  it('normalises uppercase input', () => {
    expect(normalizeRiskLevel('CRITICAL')).toBe('Critical');
    expect(normalizeRiskLevel('HIGH')).toBe('High');
  });

  it('passes through already-canonical values', () => {
    expect(normalizeRiskLevel('Critical')).toBe('Critical');
    expect(normalizeRiskLevel('High')).toBe('High');
  });

  it('returns null for unrecognised values', () => {
    expect(normalizeRiskLevel('extreme')).toBeNull();
    expect(normalizeRiskLevel('none')).toBeNull();
  });
});

describe('mergeLegacyIdentityWhenStoreEntityMissing', () => {
  it('returns store fields when they have usable values', () => {
    expect(
      mergeLegacyIdentityWhenStoreEntityMissing({ 'host.name': 'h1' }, { 'host.name': 'legacy' })
    ).toEqual({ 'host.name': 'h1' });
  });

  it('falls back to legacy ECS pairs when store map is empty', () => {
    expect(
      mergeLegacyIdentityWhenStoreEntityMissing({}, { 'user.name': 'alice', 'host.name': 'srv' })
    ).toEqual({ 'user.name': 'alice', 'host.name': 'srv' });
  });

  it('falls back when store map has only whitespace values', () => {
    expect(
      mergeLegacyIdentityWhenStoreEntityMissing({ 'host.name': '  ' }, { 'host.name': 'ok' })
    ).toEqual({ 'host.name': 'ok' });
  });
});
