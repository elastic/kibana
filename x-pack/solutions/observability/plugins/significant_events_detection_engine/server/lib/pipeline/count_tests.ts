/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Bisection steps for a rate bound; 60 halvings are far below any count's resolution. */
const BISECTION_STEPS = 60;

/**
 * P(X <= count) for X ~ Poisson(mean). Small counts are where a normal approximation fails:
 * a quiet service's documents in a minute, or a detector's events in a short trial.
 */
export function poissonCdf({ count, mean }: { count: number; mean: number }): number {
  if (count < 0) {
    return 0;
  }
  if (mean <= 0) {
    return 1;
  }
  // A loop, not a reduce: each term is the previous one times mean / k. The terms stay in log
  // space because e^-mean underflows to zero for a busy service.
  let logTerm = -mean;
  let sum = Math.exp(logTerm);
  for (let k = 1; k <= Math.floor(count); k++) {
    logTerm += Math.log(mean) - Math.log(k);
    sum += Math.exp(logTerm);
  }
  return Math.min(1, sum);
}

/**
 * One-sided lower confidence bound on a Poisson rate, per unit of `exposure`. A rate above a bar
 * only counts as shown when even this bound is above it: one event in a 30-minute trial is not
 * yet evidence of 48 a day.
 */
export function poissonRateLowerBound({
  count,
  exposure,
  confidence = 0.95,
}: {
  count: number;
  exposure: number;
  confidence?: number;
}): number {
  if (count <= 0 || exposure <= 0) {
    return 0;
  }
  const alpha = 1 - confidence;
  // P(X >= count) grows with the mean, and is about one half at mean = count, so the bound
  // sits in [0, count].
  const atLeastCount = (mean: number) => 1 - poissonCdf({ count: count - 1, mean });
  const bound = Array.from({ length: BISECTION_STEPS }).reduce<{ low: number; high: number }>(
    ({ low, high }) => {
      const mid = (low + high) / 2;
      return atLeastCount(mid) < alpha ? { low: mid, high } : { low, high: mid };
    },
    { low: 0, high: count }
  );
  return bound.high / exposure;
}

/** Terms this small next to the running sum no longer change it. */
const NEGLIGIBLE_TERM = 1e-15;

/**
 * P(X >= count) for X ~ Binomial(trials, probability): how likely this many failures are when
 * the true failure rate is `probability`. A ratio alone cannot tell 5 failures of 100 from
 * chance at a 1% normal rate; this can.
 */
export function binomialUpperTail({
  count,
  trials,
  probability,
}: {
  count: number;
  trials: number;
  probability: number;
}): number {
  if (count <= 0) {
    return 1;
  }
  if (count > trials || probability <= 0) {
    return 0;
  }
  if (probability >= 1) {
    return 1;
  }
  const logP = Math.log(probability);
  const logQ = Math.log(1 - probability);
  const logTrials = logFactorial(trials);
  const logChoose = (k: number) => logTrials - logFactorial(k) - logFactorial(trials - k);
  // A loop, not a reduce: above the mean each term is smaller than the last, so the sum stops
  // as soon as the terms no longer matter instead of walking every trial.
  let sum = 0;
  for (let k = Math.floor(count); k <= trials; k++) {
    const term = Math.exp(logChoose(k) + k * logP + (trials - k) * logQ);
    sum += term;
    if (k > trials * probability && term < sum * NEGLIGIBLE_TERM) {
      break;
    }
  }
  return Math.min(1, sum);
}

/** log(n!) with Stirling's series past 20, exact below. */
function logFactorial(n: number): number {
  if (n < 2) {
    return 0;
  }
  if (n <= 20) {
    return Array.from({ length: n - 1 }, (_, index) => Math.log(index + 2)).reduce(
      (sum, value) => sum + value,
      0
    );
  }
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n) - 1 / (360 * n ** 3);
}
