/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToQueryString } from './utils';

describe('convertToQueryString', () => {
  it('returns empty string for empty object', () => {
    expect(convertToQueryString({})).toBe('');
  });

  it('returns query string for single key-value pair', () => {
    expect(convertToQueryString({ a: 'b' })).toBe('?a=b');
  });

  it('returns query string for multiple key-value pairs', () => {
    expect(convertToQueryString({ a: 'b', c: 1 })).toBe('?a=b&c=1');
  });

  it('skips undefined and null values', () => {
    expect(convertToQueryString({ a: 'b', c: 1, skip: undefined, alsoSkip: null })).toBe(
      '?a=b&c=1'
    );
  });

  it('converts boolean and number values to string', () => {
    expect(convertToQueryString({ a: true, b: false, c: 0, d: 1 })).toBe('?a=true&b=false&c=0&d=1');
  });
});
