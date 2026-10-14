/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeRiskScore, resolveRiskScore } from './add_severity_and_risk_score';

describe('sanitizeRiskScore', () => {
  it('clamps values below 0 to 0', () => {
    expect(sanitizeRiskScore(-5)).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    expect(sanitizeRiskScore(150)).toBe(100);
  });

  it('rounds fractional values', () => {
    expect(sanitizeRiskScore(47.6)).toBe(48);
  });

  it('coerces numeric strings', () => {
    expect(sanitizeRiskScore('73')).toBe(73);
  });

  it('returns undefined for non-finite values', () => {
    expect(sanitizeRiskScore('abc')).toBeUndefined();
    expect(sanitizeRiskScore(NaN)).toBeUndefined();
    expect(sanitizeRiskScore(Infinity)).toBeUndefined();
  });
});

describe('resolveRiskScore', () => {
  it('returns the model score when within ±10 of canonical', () => {
    expect(resolveRiskScore('medium', 50)).toBe(50); // canonical 47, diff 3
    expect(resolveRiskScore('medium', 57)).toBe(57); // canonical 47, diff 10
  });

  it('falls back to canonical when outside ±10', () => {
    expect(resolveRiskScore('medium', 58)).toBe(47); // diff 11
    expect(resolveRiskScore('high', 60)).toBe(73); // diff 13
  });

  it('falls back to canonical when score is undefined', () => {
    expect(resolveRiskScore('low', undefined)).toBe(21);
    expect(resolveRiskScore('critical', undefined)).toBe(99);
  });
});
