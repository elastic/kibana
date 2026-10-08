/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPUS_CASE_COUNTS } from './constants';
import { corporaForCohort, DEFAULT_MAX_EXAMPLES_PER_CORPUS, resolveCohort } from './cohort';

/** The Playwright timeout the suite always had; the budget never goes below it. */
export const MIN_TEST_TIMEOUT_MS = 120 * 60_000;

/** Live verdicts measured ~28s/case (run9); doubled for model/latency spread. */
export const PER_CASE_BUDGET_MS = 60_000;

/** Examples an experiment runs at once when EVAL_CONCURRENCY is unset (kbn-evals default). */
export const DEFAULT_CONCURRENCY = 5;

const positiveInt = (raw: string | undefined, fallback: number): number => {
  const n = Number((raw ?? '').trim());
  return Number.isSafeInteger(n) && n >= 1 ? n : fallback;
};

/** Cases a run grades per repetition: the cohort's corpora, each capped like `capExamples`. */
export const countCohortCases = (env: NodeJS.ProcessEnv): number => {
  const max = Number(env.FP_TP_MAX_EXAMPLES_PER_CORPUS ?? DEFAULT_MAX_EXAMPLES_PER_CORPUS);
  const cap = Number.isFinite(max) && max > 0 ? max : Infinity;
  return corporaForCohort(resolveCohort(env.FP_TP_COHORT)).reduce(
    (sum, name) => sum + Math.min(cap, CORPUS_CASE_COUNTS[name]),
    0
  );
};

/**
 * Playwright test timeout for one project (model) column: every case runs once per
 * repetition, `concurrency` at a time, all inside a single test.
 */
export const testTimeoutMs = (env: NodeJS.ProcessEnv): number => {
  const repetitions = positiveInt(env.EVAL_REPETITIONS, 1);
  const concurrency = positiveInt(env.EVAL_CONCURRENCY, DEFAULT_CONCURRENCY);
  const waves = Math.ceil((countCohortCases(env) * repetitions) / concurrency);
  return Math.max(MIN_TEST_TIMEOUT_MS, waves * PER_CASE_BUDGET_MS);
};
