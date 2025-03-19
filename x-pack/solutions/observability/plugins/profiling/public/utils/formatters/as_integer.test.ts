/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { asInteger } from './as_integer';

describe('asInteger', () => {
  it('rounds numbers appropriately', () => {
    expect(asInteger(999)).toBe('999');

    expect(asInteger(1.11)).toBe('1');

    expect(asInteger(1.5)).toBe('2');

    expect(asInteger(0.001)).toBe('0');

    expect(asInteger(0)).toBe('0');
  });
});
