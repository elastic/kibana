/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MINUTE_MS = 60_000;
const MIN_TIMEOUT_MS = 60 * MINUTE_MS;
const PER_REPETITION_MS = 30 * MINUTE_MS;

/**
 * One Playwright test runs every example for every repetition, so the budget grows with the count.
 * Mirrors kbn-evals' EVAL_REPETITIONS resolution; the suite config sets no `repetitions` option, so the env var is the only source.
 */
export const getTestTimeoutMs = (repetitionsEnv: string | undefined): number => {
  const repetitions = parseInt(repetitionsEnv ?? '', 10) || 1;
  return Math.max(MIN_TIMEOUT_MS, repetitions * PER_REPETITION_MS);
};
