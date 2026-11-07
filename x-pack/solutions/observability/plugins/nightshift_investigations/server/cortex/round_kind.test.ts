/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyCortexRound, shouldOptimizeRound } from './round_kind';

describe('classifyCortexRound', () => {
  it('treats a later round as a follow-up, whoever started it', () => {
    expect(classifyCortexRound({ roundIndex: 1 })).toBe('follow_up');
    expect(classifyCortexRound({ roundIndex: 4 })).toBe('follow_up');
  });

  it.each([[0], [undefined]])('treats the first round (index %s) as initial', (roundIndex) => {
    expect(classifyCortexRound({ roundIndex })).toBe('initial');
  });
});

describe('shouldOptimizeRound', () => {
  it.each([
    ['initial', 0, false],
    ['initial', 2, false],
    ['initial', 3, true],
    ['follow_up', 0, false],
    ['follow_up', 1, true],
    ['follow_up', 5, true],
  ] as const)('%s with %s sandbox calls runs: %s', (roundKind, count, runs) => {
    expect(shouldOptimizeRound({ roundKind, sandboxToolCallCount: count })).toBe(runs);
  });
});
