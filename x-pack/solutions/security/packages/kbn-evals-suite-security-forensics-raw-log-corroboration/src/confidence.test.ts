/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseConfidence } from './confidence';

describe('parseConfidence', () => {
  it('reads the machine-readable line the prompt requires', () => {
    expect(parseConfidence('Findings.\nConfidence: 0.8')).toBe(0.8);
    expect(parseConfidence('Confidence: 0.35')).toBe(0.35);
    expect(parseConfidence('- Confidence: 1')).toBe(1);
    expect(parseConfidence('Confidence: 0')).toBe(0);
  });

  it('reads a percentage', () => {
    expect(parseConfidence('Confidence: 85%')).toBeCloseTo(0.85, 5);
    expect(parseConfidence('overall confidence 40%')).toBeCloseTo(0.4, 5);
  });

  it('reads a label spelling', () => {
    expect(parseConfidence('Confidence: high')).toBe(0.9);
    expect(parseConfidence('Confidence: Low')).toBe(0.3);
    expect(parseConfidence('Confidence: none')).toBe(0);
  });

  it('returns undefined when no confidence is stated', () => {
    // The gate must fail a report that never commits to a confidence — the
    // whole point of the dataset's minConfidence field.
    expect(parseConfidence('Three stages corroborated. Two gaps identified.')).toBeUndefined();
    expect(parseConfidence('')).toBeUndefined();
    expect(parseConfidence('I am confident the host was compromised.')).toBeUndefined();
  });

  it('does not accept an out-of-range number as a high confidence', () => {
    // `Confidence: 5` is a format violation, not a 100% claim; clamping it to 1
    // would let a malformed report satisfy the floor.
    expect(parseConfidence('Confidence: 5')).toBeUndefined();
    expect(parseConfidence('Confidence: 850%')).toBeUndefined();
  });

  it('rejects a multi-digit out-of-range value instead of reading its first digit', () => {
    // Regression: the decimal capture was `(\d(?:\.\d+)?)`, so it matched the
    // leading digit of `Confidence: 12` and returned a PASSING 1. Every value
    // from 10 to 19 could therefore satisfy the confidence floor on a report
    // that states no usable confidence.
    for (const malformed of [
      'Confidence: 12',
      'Confidence: 10',
      'Confidence: 19',
      'confidence 99',
    ]) {
      expect(parseConfidence(malformed)).toBeUndefined();
    }
  });

  it('still reads the in-range decimals it read before', () => {
    // The boundary the fix must not cross: whole-token capture keeps every
    // legitimate single-digit and fractional value working.
    expect(parseConfidence('Confidence: 1')).toBe(1);
    expect(parseConfidence('Confidence: 0')).toBe(0);
    expect(parseConfidence('Confidence: 0.8')).toBe(0.8);
    expect(parseConfidence('Confidence: 0.05')).toBe(0.05);
    expect(parseConfidence('Confidence: 1.0')).toBe(1);
  });
});
