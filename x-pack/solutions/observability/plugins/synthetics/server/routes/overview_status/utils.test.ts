/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { periodToMs } from './utils';

describe('periodToMs', () => {
  it('returns 0 for unsupported unit type', () => {
    // @ts-expect-error Providing invalid value to test handler in function
    expect(periodToMs({ number: '10', unit: 'rad' })).toEqual(0);
  });

  it('converts seconds', () => {
    expect(periodToMs({ number: '10', unit: 's' })).toEqual(10_000);
  });

  it('converts minutes', () => {
    expect(periodToMs({ number: '1', unit: 'm' })).toEqual(60_000);
  });

  it('converts hours', () => {
    expect(periodToMs({ number: '1', unit: 'h' })).toEqual(3_600_000);
  });
});
