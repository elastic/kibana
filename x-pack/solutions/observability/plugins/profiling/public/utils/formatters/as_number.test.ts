/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { asNumber } from './as_number';
import { NOT_AVAILABLE_LABEL } from '../../../common';

describe('asNumber', () => {
  it('rounds numbers appropriately', () => {
    expect(asNumber(999)).toBe('999');

    expect(asNumber(1.11)).toBe('1.11');

    expect(asNumber(0.001)).toBe('~0.00');

    expect(asNumber(0)).toBe('0');

    expect(asNumber(12.34)).toBe('12.34');
  });

  it('adds k/m/b/t/q where needed', () => {
    expect(asNumber(999.999)).toBe('1k');

    expect(asNumber(4.5e5)).toBe('450k');

    expect(asNumber(4.5001e5)).toBe('450.01k');

    expect(asNumber(2.4991e7)).toBe('24.99m');

    expect(asNumber(9e9)).toBe('9b');

    expect(asNumber(1e12)).toBe('1t');

    expect(asNumber(3.668e15)).toBe('3.67q');

    expect(asNumber(9.9958e17)).toBe('999.58q');
  });

  it('handles non-finite values', () => {
    expect(asNumber(Infinity)).toBe(NOT_AVAILABLE_LABEL);
    expect(asNumber(-Infinity)).toBe(NOT_AVAILABLE_LABEL);
    expect(asNumber(NaN)).toBe(NOT_AVAILABLE_LABEL);
  });

  it('handles very large numbers without causing recursion errors', () => {
    expect(() => asNumber(Number.MAX_VALUE)).not.toThrow();
    expect(asNumber(1e18)).toBe(NOT_AVAILABLE_LABEL);
    expect(asNumber(1e300)).toBe(NOT_AVAILABLE_LABEL);

    expect(asNumber(Number.MAX_VALUE)).toBe(NOT_AVAILABLE_LABEL);
  });

  it('handles very small numbers', () => {
    expect(asNumber(1e-10)).toBe('~0.00');
    expect(asNumber(Number.MIN_VALUE)).toBe('~0.00');
  });

  it('handles negative numbers', () => {
    expect(asNumber(-999)).toBe('-999');
    expect(asNumber(-4.5e5)).toBe('-450k');
    expect(asNumber(-2.4991e7)).toBe('-24.99m');
    expect(asNumber(-9e9)).toBe('-9b');
    expect(asNumber(-1e12)).toBe('-1t');
    expect(asNumber(-3.668e15)).toBe('-3.67q');
    expect(asNumber(-9.9958e17)).toBe('-999.58q');
  });
});
