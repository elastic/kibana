/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { numberOr, stringOrNull, stringsOf, totalHitsOf } from './values';

describe('numberOr', () => {
  it.each([0, -1, 1.5])('keeps the finite number %p', (value) => {
    expect(numberOr(value, null)).toBe(value);
  });

  it.each([NaN, Infinity, -Infinity])('falls back on %p, which no count can be', (value) => {
    expect(numberOr(value, null)).toBeNull();
  });

  it.each(['42', '', null, undefined, {}, []])(
    'falls back on %p, as a missing field comes back',
    (value) => {
      expect(numberOr(value, null)).toBeNull();
    }
  );

  it('answers with the fallback it was given', () => {
    expect(numberOr(undefined, 0)).toBe(0);
  });
});

describe('stringOrNull', () => {
  it('keeps a non-empty string', () => {
    expect(stringOrNull('Chrome')).toBe('Chrome');
  });

  it('keeps a string that only holds spaces, which is a value of its own', () => {
    expect(stringOrNull(' ')).toBe(' ');
  });

  it.each(['', null, undefined, 0, 42, {}])('answers null for %p', (value) => {
    expect(stringOrNull(value)).toBeNull();
  });
});

describe('stringsOf', () => {
  it('keeps a single value as a list, as ES|QL returns one that way', () => {
    expect(stringsOf('/cart')).toEqual(['/cart']);
  });

  it('keeps the strings of a list, in order', () => {
    expect(stringsOf(['/', '/products', '/cart'])).toEqual(['/', '/products', '/cart']);
  });

  it('drops the empty strings, which name no page or session', () => {
    expect(stringsOf(['', '/cart', ''])).toEqual(['/cart']);
  });

  it.each([null, undefined, 42, {}])('answers nothing for %p', (value) => {
    expect(stringsOf(value)).toEqual([]);
  });
});

describe('totalHitsOf', () => {
  it('reads a tracked total', () => {
    expect(totalHitsOf({ value: 120, relation: 'eq' })).toBe(120);
  });

  it('reads a total that is only a lower bound', () => {
    expect(totalHitsOf({ value: 10000, relation: 'gte' })).toBe(10000);
  });

  it('reads the number an older response holds instead', () => {
    expect(totalHitsOf(7)).toBe(7);
  });

  it('counts nothing when the response has no total', () => {
    expect(totalHitsOf(undefined)).toBe(0);
  });
});
