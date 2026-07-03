/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPageStateSlotEqual } from './page_state_equality';

describe('isPageStateSlotEqual', () => {
  describe('reference / primitive cases', () => {
    it('returns true for the same reference', () => {
      const arr = ['a'];
      expect(isPageStateSlotEqual(arr, arr)).toBe(true);
    });

    it('returns true for matching primitives', () => {
      expect(isPageStateSlotEqual(false, false)).toBe(true);
      expect(isPageStateSlotEqual(true, true)).toBe(true);
      expect(isPageStateSlotEqual('asc', 'asc')).toBe(true);
      expect(isPageStateSlotEqual(16, 16)).toBe(true);
    });

    it('returns false for differing primitives', () => {
      expect(isPageStateSlotEqual(false, true)).toBe(false);
      expect(isPageStateSlotEqual('asc', 'desc')).toBe(false);
      expect(isPageStateSlotEqual(16, 32)).toBe(false);
    });

    it('returns false when only one side is undefined and the other is a non-empty primitive', () => {
      expect(isPageStateSlotEqual(undefined, false)).toBe(false);
      expect(isPageStateSlotEqual(false, undefined)).toBe(false);
      expect(isPageStateSlotEqual(undefined, 'asc')).toBe(false);
    });
  });

  describe('undefined ↔ empty array equivalence', () => {
    it('treats `undefined` and `[]` as equivalent in either direction', () => {
      expect(isPageStateSlotEqual(undefined, [])).toBe(true);
      expect(isPageStateSlotEqual([], undefined)).toBe(true);
    });

    it('treats `[]` and `[]` as equivalent regardless of identity', () => {
      expect(isPageStateSlotEqual([], [])).toBe(true);
    });
  });

  describe('array contents comparison', () => {
    it('returns true for arrays with the same contents but different identities', () => {
      expect(isPageStateSlotEqual(['a', 'b'], ['a', 'b'])).toBe(true);
      expect(isPageStateSlotEqual(['tags'], ['tags'])).toBe(true);
    });

    it('returns false for arrays with different lengths', () => {
      expect(isPageStateSlotEqual(['a'], ['a', 'b'])).toBe(false);
      expect(isPageStateSlotEqual([], ['a'])).toBe(false);
    });

    it('returns false for arrays with different element values', () => {
      expect(isPageStateSlotEqual(['a'], ['b'])).toBe(false);
      expect(isPageStateSlotEqual(['a', 'b'], ['a', 'c'])).toBe(false);
    });

    it('returns false when one side is an array with content and the other is undefined', () => {
      expect(isPageStateSlotEqual(undefined, ['a'])).toBe(false);
      expect(isPageStateSlotEqual(['a'], undefined)).toBe(false);
    });
  });
});
