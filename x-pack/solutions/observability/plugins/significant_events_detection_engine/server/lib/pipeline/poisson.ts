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
