/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryRow } from './types';
import { asNumber, asText, hasValue, isNewer, lastSeenInstant } from './utils';

describe('lastSeenInstant', () => {
  it.each<[string, InventoryRow, number | null]>([
    ['a number as is', { last_seen: 1767225600000 }, 1767225600000],
    ['an ISO string as epoch millis', { last_seen: '2026-01-01T00:00:00Z' }, 1767225600000],
    ['null for an unparseable string', { last_seen: 'not a date' }, null],
    ['null for a missing column', {}, null],
  ])('returns %s', (_, row, expected) => {
    expect(lastSeenInstant(row)).toBe(expected);
  });
});

describe('hasValue', () => {
  it('is false for null and undefined and true for any other value', () => {
    expect([null, undefined].map(hasValue)).toEqual([false, false]);
    expect([0, '', false, ['a']].map(hasValue)).toEqual([true, true, true, true]);
  });
});

describe('isNewer', () => {
  it.each([
    [null, 1, false],
    [1, null, true],
    [2, 1, true],
    [1, 1, false],
  ])('isNewer(%p, %p) is %p', (candidate, current, expected) => {
    expect(isNewer(candidate, current)).toBe(expected);
  });
});

describe('asNumber', () => {
  it('passes a number and not a numeric string', () => {
    expect([1, '1'].map(asNumber)).toEqual([1, null]);
  });
});

describe('asText', () => {
  it('passes a non-empty string and gives null for an empty string or a number', () => {
    expect(['host-a', '', 1].map(asText)).toEqual(['host-a', null, null]);
  });
});
