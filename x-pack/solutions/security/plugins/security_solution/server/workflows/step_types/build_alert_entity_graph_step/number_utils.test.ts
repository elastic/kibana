/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toIso, toFiniteIntOr, clampPositiveInt, computePageSize } from './number_utils';

describe('number_utils', () => {
  describe('toIso', () => {
    it('converts epoch ms to ISO string', () => {
      expect(toIso(0)).toBe('1970-01-01T00:00:00.000Z');
      expect(toIso(1704067200000)).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('toFiniteIntOr', () => {
    it('returns truncated number for finite numeric input', () => {
      expect(toFiniteIntOr(5.9, 0)).toBe(5);
      expect(toFiniteIntOr(-3.1, 0)).toBe(-3);
    });

    it('returns fallback for NaN', () => {
      expect(toFiniteIntOr(NaN, 42)).toBe(42);
    });

    it('returns fallback for Infinity', () => {
      expect(toFiniteIntOr(Infinity, 42)).toBe(42);
      expect(toFiniteIntOr(-Infinity, 42)).toBe(42);
    });

    it('coerces string values', () => {
      expect(toFiniteIntOr('10', 0)).toBe(10);
      expect(toFiniteIntOr('3.7', 0)).toBe(3);
    });

    it('returns fallback for non-numeric strings', () => {
      expect(toFiniteIntOr('nope', 42)).toBe(42);
    });

    it('coerces null and empty string to 0 (Number semantics)', () => {
      // Number(null) === 0, Number('') === 0
      expect(toFiniteIntOr(null, 42)).toBe(0);
      expect(toFiniteIntOr('', 42)).toBe(0);
    });

    it('returns fallback for undefined', () => {
      expect(toFiniteIntOr(undefined, 42)).toBe(42);
    });
  });

  describe('clampPositiveInt', () => {
    it('returns the truncated value when >= 1', () => {
      expect(clampPositiveInt(5, 10)).toBe(5);
      expect(clampPositiveInt(1.9, 10)).toBe(1);
    });

    it('returns fallback for zero', () => {
      expect(clampPositiveInt(0, 10)).toBe(10);
    });

    it('returns fallback for negative values', () => {
      expect(clampPositiveInt(-5, 10)).toBe(10);
    });

    it('returns fallback for NaN', () => {
      expect(clampPositiveInt(NaN, 10)).toBe(10);
    });

    it('returns fallback for Infinity', () => {
      expect(clampPositiveInt(Infinity, 10)).toBe(10);
    });
  });

  describe('computePageSize', () => {
    it('returns the requested size when remaining is larger', () => {
      expect(computePageSize(100, 500, 200)).toBe(100);
    });

    it('returns the remaining when it is smaller than requested', () => {
      expect(computePageSize(100, 50, 200)).toBe(50);
    });

    it('returns at least 1 when remaining is zero or negative', () => {
      expect(computePageSize(100, 0, 200)).toBe(1);
      expect(computePageSize(100, -10, 200)).toBe(1);
    });

    it('uses fallback when requested is NaN', () => {
      expect(computePageSize(NaN, 500, 200)).toBe(200);
    });

    it('uses fallback when remaining is NaN', () => {
      // When remaining is NaN, it falls back to the requested value
      expect(computePageSize(100, NaN, 200)).toBe(100);
    });

    it('coerces string inputs', () => {
      expect(computePageSize('50', '30', 200)).toBe(30);
    });
  });
});
