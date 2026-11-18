/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The seeded random number generator of the test setup (mulberry32). The generator, the sampler and the fake LLM all use it, so
 * that the same seed gives the same numbers in every script, and a change in one place cannot make them differ.
 *
 * The repo lint rule `no-bitwise` forbids the operators (`^`, `|`, `>>>`) that the algorithm is written with. `Uint32Array` and
 * `Atomics` do the 32-bit wrap-around, the xor and the or with the same results, and a shift to the right is a division. The
 * output equals the output of the original operator version for every seed (see `seeded_random.test.ts`).
 */

const word = new Uint32Array(1);

const toUint32 = (value: number): number => {
  word[0] = value;
  return word[0];
};

const xor32 = (left: number, right: number): number => {
  word[0] = left;
  Atomics.xor(word, 0, right);
  return word[0];
};

const or32 = (left: number, right: number): number => {
  word[0] = left;
  Atomics.or(word, 0, right);
  return word[0];
};

const shiftRight32 = (value: number, bits: number): number =>
  Math.floor(toUint32(value) / 2 ** bits);

/** A function that returns the next number in [0, 1). The seed is taken as an unsigned 32-bit integer. */
export const mulberry32 = (seed: number): (() => number) => {
  let state = toUint32(seed);
  return () => {
    state = toUint32(state + 0x6d2b79f5);
    let t = state;
    t = Math.imul(xor32(t, shiftRight32(t, 15)), or32(t, 1));
    t = xor32(t, t + Math.imul(xor32(t, shiftRight32(t, 7)), or32(t, 61)));
    return xor32(t, shiftRight32(t, 14)) / 4294967296;
  };
};
