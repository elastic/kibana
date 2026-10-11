/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countCohortCases, MIN_TEST_TIMEOUT_MS, PER_CASE_BUDGET_MS, testTimeoutMs } from './budget';

describe('countCohortCases', () => {
  it('counts the full scored cohort (267) when uncapped', () => {
    expect(countCohortCases({ FP_TP_COHORT: 'scored', FP_TP_MAX_EXAMPLES_PER_CORPUS: '0' })).toBe(
      267
    );
  });

  it('counts all 39 event-bearing rows for the evidenced cohort (no default cap)', () => {
    expect(countCohortCases({ FP_TP_COHORT: 'evidenced' })).toBe(39);
  });

  it('applies the per-corpus cap on top of the cohort', () => {
    // benign-day 96→15, fp-alerts 54→15, tp-chains 3, twins 21→15, perturbations 15, cloud 78→15
    expect(countCohortCases({ FP_TP_COHORT: 'scored' })).toBe(15 + 15 + 3 + 15 + 15 + 15);
  });
});

describe('testTimeoutMs', () => {
  it('keeps the 120 min floor for small runs', () => {
    expect(testTimeoutMs({})).toBe(MIN_TEST_TIMEOUT_MS);
  });

  it('sizes the full scored cohort x3 reps at default concurrency above the old 120 min', () => {
    const env = {
      FP_TP_COHORT: 'scored',
      FP_TP_MAX_EXAMPLES_PER_CORPUS: '0',
      EVAL_REPETITIONS: '3',
    };
    // ceil(267 * 3 / 5) = 161 waves
    expect(testTimeoutMs(env)).toBe(161 * PER_CASE_BUDGET_MS);
    expect(testTimeoutMs(env)).toBeGreaterThan(MIN_TEST_TIMEOUT_MS);
  });

  it('grows with repetitions and shrinks with concurrency', () => {
    const base = { FP_TP_COHORT: 'scored', FP_TP_MAX_EXAMPLES_PER_CORPUS: '0' };
    expect(testTimeoutMs({ ...base, EVAL_REPETITIONS: '9' })).toBeGreaterThan(
      testTimeoutMs({ ...base, EVAL_REPETITIONS: '3' })
    );
    expect(testTimeoutMs({ ...base, EVAL_REPETITIONS: '9', EVAL_CONCURRENCY: '20' })).toBe(
      Math.max(MIN_TEST_TIMEOUT_MS, Math.ceil((267 * 9) / 20) * PER_CASE_BUDGET_MS)
    );
  });
});
