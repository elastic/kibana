/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean, ndcgAtK, percentile, recallAtK, reciprocalRank, successAtK } from './metrics';

describe('recallAtK', () => {
  it('scores a perfect retrieval as 1', () => {
    expect(recallAtK(['T1078', 'T1003'], new Set(['T1078', 'T1003']), 10)).toBe(1);
  });

  it('scores partial retrieval as the fraction of relevant ids found', () => {
    expect(recallAtK(['T1078', 'T9999'], new Set(['T1078', 'T1003']), 10)).toBe(0.5);
  });

  it('ignores relevant results ranked below k', () => {
    expect(recallAtK(['T9999', 'T1078'], new Set(['T1078']), 1)).toBe(0);
  });

  it('does not double count a duplicated id', () => {
    expect(recallAtK(['T1078', 'T1078'], new Set(['T1078', 'T1003']), 10)).toBe(0.5);
  });

  it('returns 0 when there is nothing to find', () => {
    expect(recallAtK(['T1078'], new Set(), 10)).toBe(0);
  });
});

describe('successAtK', () => {
  it('scores 1 when one of several relevant ids is found', () => {
    expect(successAtK(['T1078', 'T9999'], new Set(['T1078', 'T1003']), 10)).toBe(1);
  });

  it('does not penalise a partial hit the way recall does', () => {
    const ranked = ['T1078', 'T9999'];
    const relevant = new Set(['T1078', 'T1003', 'T1055']);
    expect(recallAtK(ranked, relevant, 10)).toBeCloseTo(1 / 3);
    expect(successAtK(ranked, relevant, 10)).toBe(1);
  });

  it('ignores relevant results ranked below k', () => {
    expect(successAtK(['T9999', 'T1078'], new Set(['T1078']), 1)).toBe(0);
  });

  it('returns 0 when nothing relevant is retrieved', () => {
    expect(successAtK(['T9999'], new Set(['T1078']), 10)).toBe(0);
  });

  it('returns 0 when there is nothing to find', () => {
    expect(successAtK(['T1078'], new Set(), 10)).toBe(0);
  });
});

describe('reciprocalRank', () => {
  it('returns 1 when the first result is relevant', () => {
    expect(reciprocalRank(['T1078', 'T9999'], new Set(['T1078']), 10)).toBe(1);
  });

  it('discounts by the position of the first relevant result', () => {
    expect(reciprocalRank(['T9999', 'T8888', 'T1078'], new Set(['T1078']), 10)).toBeCloseTo(1 / 3);
  });

  it('returns 0 when no relevant result is within k', () => {
    expect(reciprocalRank(['T9999', 'T1078'], new Set(['T1078']), 1)).toBe(0);
  });
});

describe('ndcgAtK', () => {
  it('scores an ideal ranking as 1', () => {
    expect(ndcgAtK(['T1078', 'T1003'], new Set(['T1078', 'T1003']), 10)).toBeCloseTo(1);
  });

  it('scores a ranking with the relevant ids last below an ideal ranking', () => {
    const ideal = ndcgAtK(['T1078', 'T1003', 'X', 'Y'], new Set(['T1078', 'T1003']), 10);
    const worse = ndcgAtK(['X', 'Y', 'T1078', 'T1003'], new Set(['T1078', 'T1003']), 10);

    expect(worse).toBeLessThan(ideal);
    expect(worse).toBeGreaterThan(0);
  });

  it('caps the ideal ranking at k so a truncated list can still score 1', () => {
    expect(ndcgAtK(['T1078'], new Set(['T1078', 'T1003']), 1)).toBeCloseTo(1);
  });

  it('returns 0 when nothing relevant is retrieved', () => {
    expect(ndcgAtK(['X', 'Y'], new Set(['T1078']), 10)).toBe(0);
  });
});

describe('percentile', () => {
  it('returns the maximum for p100', () => {
    expect(percentile([1, 2, 3, 4], 1)).toBe(4);
  });

  it('returns the median-ish value for p50', () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(20);
  });

  it('is order independent', () => {
    expect(percentile([40, 10, 30, 20], 0.5)).toBe(20);
  });

  it('returns 0 for an empty sample', () => {
    expect(percentile([], 0.95)).toBe(0);
  });
});

describe('mean', () => {
  it('averages the values', () => {
    expect(mean([1, 2, 3])).toBe(2);
  });

  it('returns 0 for an empty sample', () => {
    expect(mean([])).toBe(0);
  });
});
