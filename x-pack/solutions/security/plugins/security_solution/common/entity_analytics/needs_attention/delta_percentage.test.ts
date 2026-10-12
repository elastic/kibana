/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeltaPercentage } from './delta_percentage';

describe('getDeltaPercentage', () => {
  it('returns a positive percentage when the count rose', () => {
    // previous = 120 - 20 = 100
    expect(getDeltaPercentage(20, 120)).toBe(20);
  });

  it('returns a negative percentage when the count fell', () => {
    // previous = 80 - (-20) = 100
    expect(getDeltaPercentage(-20, 80)).toBe(-20);
  });

  it('rounds to a whole number', () => {
    // previous = 3, 1 / 3 = 33.33%
    expect(getDeltaPercentage(1, 4)).toBe(33);
  });

  it('returns undefined when the previous count is zero', () => {
    expect(getDeltaPercentage(5, 5)).toBeUndefined();
  });

  it('returns undefined when the previous count would be negative', () => {
    expect(getDeltaPercentage(10, 5)).toBeUndefined();
  });

  it('returns undefined when the change rounds to 0%', () => {
    // previous = 400, 1 / 400 = 0.25%
    expect(getDeltaPercentage(1, 401)).toBeUndefined();
  });
});
