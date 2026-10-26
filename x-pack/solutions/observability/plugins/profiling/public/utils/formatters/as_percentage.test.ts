/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { asPercentage } from './as_percentage';
import { NOT_AVAILABLE_LABEL } from '../../../common';

describe('asPercentage', () => {
  it('handles non-finite values', () => {
    expect(asPercentage(Infinity)).toBe(`${NOT_AVAILABLE_LABEL}%`);
    expect(asPercentage(-Infinity)).toBe(`${NOT_AVAILABLE_LABEL}%`);
    expect(asPercentage(NaN)).toBe(`${NOT_AVAILABLE_LABEL}%`);
  });

  it('formats normal percentage values', () => {
    expect(asPercentage(0)).toBe('0%');
    expect(asPercentage(0.1)).toBe('10%');
    expect(asPercentage(0.5)).toBe('50%');
    expect(asPercentage(1)).toBe('100%');
    expect(asPercentage(0.123)).toBe('12.3%');
    expect(asPercentage(0.001)).toBe('0.1%');
  });

  it('handles large percentage values', () => {
    expect(asPercentage(10)).toBe('1k%');
    expect(asPercentage(100)).toBe('10k%');
  });
});
