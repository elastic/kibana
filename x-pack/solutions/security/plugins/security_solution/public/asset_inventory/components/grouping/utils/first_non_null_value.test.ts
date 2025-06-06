/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstNonNullValue } from './first_non_null_value';

describe('firstNonNullValue', () => {
  it('returns the value itself for non-null single value', () => {
    expect(firstNonNullValue(5)).toBe(5);
  });

  it('returns undefined for a null single value', () => {
    expect(firstNonNullValue(null)).toBeUndefined();
  });

  it('returns undefined for an array of all null values', () => {
    expect(firstNonNullValue([null, null, null])).toBeUndefined();
  });

  it('returns the first non-null value in an array of mixed values', () => {
    expect(firstNonNullValue([null, 7, 8])).toBe(7);
  });

  it('returns the first value in an array of all non-null values', () => {
    expect(firstNonNullValue([3, 4, 5])).toBe(3);
  });

  it('returns undefined for an empty array', () => {
    expect(firstNonNullValue([])).toBeUndefined();
  });
});
