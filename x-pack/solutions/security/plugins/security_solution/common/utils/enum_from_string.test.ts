/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enumFromString } from './enum_from_string';

describe('enumFromString', () => {
  enum TestStringEnum {
    'foo' = 'foo',
    'bar' = 'bar',
  }

  const testEnumFromString = enumFromString(TestStringEnum);

  it('returns enum if provided with a known value', () => {
    expect(testEnumFromString('foo')).toEqual(TestStringEnum.foo);
    expect(testEnumFromString('bar')).toEqual(TestStringEnum.bar);
  });

  it('returns null if provided with an unknown value', () => {
    expect(testEnumFromString('xyz')).toEqual(null);
    expect(testEnumFromString('123')).toEqual(null);
  });

  it('returns null if provided with null', () => {
    expect(testEnumFromString(null)).toEqual(null);
  });

  it('returns null if provided with undefined', () => {
    expect(testEnumFromString(undefined)).toEqual(null);
  });
});
