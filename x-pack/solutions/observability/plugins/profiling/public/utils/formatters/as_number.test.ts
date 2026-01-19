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
  });

  it('adds k/m/b where needed', () => {
    expect(asNumber(999.999)).toBe('1k');

    expect(asNumber(4.5e5)).toBe('450k');

    expect(asNumber(4.5001e5)).toBe('450.01k');

    expect(asNumber(2.4991e7)).toBe('24.99m');

    expect(asNumber(9e9)).toBe('9b');
  });

  it('handles non-finite values', () => {
    expect(asNumber(Infinity)).toBe(NOT_AVAILABLE_LABEL);
    expect(asNumber(-Infinity)).toBe(NOT_AVAILABLE_LABEL);
    expect(asNumber(NaN)).toBe(NOT_AVAILABLE_LABEL);
  });
});
