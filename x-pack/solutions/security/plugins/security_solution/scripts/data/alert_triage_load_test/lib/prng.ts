/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Random = () => number;

// Park-Miller "minimal standard" generator: state * 48271 mod (2^31 - 1). The product stays below
// 2^53, so plain number arithmetic is exact and no bit operations are needed.
const MODULUS = 2147483647;
const MULTIPLIER = 48271;
// Nearby seeds start with correlated outputs; discarding a few decorrelates them.
const WARM_UP_DRAWS = 16;

/** Deterministic PRNG returning floats in [0, 1). The same seed always gives the same sequence. */
export const createRandom = (seed: number): Random => {
  let state = (Math.abs(Math.trunc(seed)) % (MODULUS - 1)) + 1;
  const next = (): number => {
    state = (state * MULTIPLIER) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
  for (let draw = 0; draw < WARM_UP_DRAWS; draw++) next();
  return next;
};

export const randomInt = (random: Random, maxExclusive: number): number =>
  Math.floor(random() * maxExclusive);

/** In-place Fisher-Yates shuffle. */
export const shuffleInPlace = <T>(items: T[], random: Random): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(random, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};
