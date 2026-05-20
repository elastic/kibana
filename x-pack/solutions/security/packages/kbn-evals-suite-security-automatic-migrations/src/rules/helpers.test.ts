/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { levenshteinDistance, levenshteinSimilarity, esqlHasLookupJoin } from './helpers';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });
  it('returns length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });
  it('returns correct distance for simple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('abc', 'abc')).toBe(1);
  });
  it('returns 0 for completely different strings of same length', () => {
    expect(levenshteinSimilarity('abc', 'xyz')).toBe(0);
  });
  it('returns 1 when both strings are empty', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });
  it('rounds to 3 decimal places', () => {
    const score = levenshteinSimilarity('FROM logs-* | WHERE x > 1', 'FROM logs-* | WHERE x > 2');
    expect(score).toBe(Math.round(score * 1000) / 1000);
  });
});

describe('esqlHasLookupJoin', () => {
  it('detects LOOKUP JOIN', () => {
    expect(esqlHasLookupJoin('FROM logs-* | LOOKUP JOIN threat_list ON ip')).toBe(true);
  });
  it('detects case-insensitive', () => {
    expect(esqlHasLookupJoin('FROM logs-* | lookup join threat_list ON ip')).toBe(true);
  });
  it('returns false when not present', () => {
    expect(esqlHasLookupJoin('FROM logs-* | WHERE x > 1')).toBe(false);
  });
});
