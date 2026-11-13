/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CAPTURED_JUDGEMENTS,
  getJudgementBucket,
  getMockJudgement,
  getMockOffset,
  getMockTypicalScore,
  isUnclear,
} from './prototype_data';

describe('captured judgements', () => {
  it('has probabilities that sum to one, as the model returned them', () => {
    CAPTURED_JUDGEMENTS.forEach(({ probabilities }) => {
      expect(probabilities.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 1);
    });
  });
});

describe('getMockJudgement', () => {
  it('gives the same judgement to the same alert every time', () => {
    expect(getMockJudgement('alert-1')).toBe(getMockJudgement('alert-1'));
  });

  it('spreads alerts over more than one judgement', () => {
    const buckets = new Set(
      Array.from({ length: 50 }, (_, i) => getJudgementBucket(getMockJudgement(`alert-${i}`)))
    );
    expect(buckets.size).toBeGreaterThan(1);
  });
});

describe('getJudgementBucket', () => {
  it.each([
    [[0.9, 0.1, 0], 0],
    [[0.1, 0.8, 0.1], 1],
    [[0, 0.05, 0.95], 2],
    [[0.2, 0.4, 0.4], 1],
  ] as const)('picks the likeliest bucket of %j', (probabilities, bucket) => {
    expect(getJudgementBucket({ probabilities, confidence: 1 })).toBe(bucket);
  });
});

describe('isUnclear', () => {
  it('flags a confidence below 0.5 only', () => {
    expect(isUnclear({ probabilities: [0.4, 0.3, 0.3], confidence: 0.49 })).toBe(true);
    expect(isUnclear({ probabilities: [0.4, 0.3, 0.3], confidence: 0.5 })).toBe(false);
  });
});

describe('getMockTypicalScore', () => {
  it('is the same for the same entity and current score', () => {
    expect(getMockTypicalScore('user:a', 70)).toBe(getMockTypicalScore('user:a', 70));
  });

  it('stays within the 0 to 100 score range', () => {
    Array.from({ length: 100 }, (_, i) => `entity-${i}`).forEach((id) => {
      [0, 50, 100].forEach((current) => {
        const typical = getMockTypicalScore(id, current);
        expect(typical).toBeGreaterThanOrEqual(0);
        expect(typical).toBeLessThanOrEqual(100);
      });
    });
  });

  it('puts the current score between 25 below and 45 above the typical one', () => {
    Array.from({ length: 100 }, (_, i) => `entity-${i}`).forEach((id) => {
      const difference = 50 - getMockTypicalScore(id, 50);
      expect(difference).toBeGreaterThanOrEqual(-25);
      expect(difference).toBeLessThanOrEqual(45);
    });
  });
});

describe('getMockOffset', () => {
  const ids = Array.from({ length: 400 }, (_, i) => `entity-${i}`);

  it('is never zero, so a demo shows no flat 0.00 rows', () => {
    ids.forEach((id) => expect(Math.abs(getMockOffset(id))).toBeGreaterThanOrEqual(0.5));
  });

  it('mixes the stories, so any filtered list shows a spread', () => {
    const offsets = ids.map(getMockOffset);
    const share = (matches: (offset: number) => boolean) =>
      offsets.filter(matches).length / offsets.length;

    expect(share((offset) => offset >= 20)).toBeGreaterThan(0.1); // escalating
    expect(share((offset) => Math.abs(offset) <= 3.5)).toBeGreaterThan(0.2); // steady
    expect(share((offset) => offset >= 6 && offset <= 15)).toBeGreaterThan(0.1); // rising
    expect(share((offset) => offset <= -8)).toBeGreaterThan(0.1); // cooling
  });

  it('is the same for the same entity', () => {
    expect(getMockOffset('user:a')).toBe(getMockOffset('user:a'));
  });
});
