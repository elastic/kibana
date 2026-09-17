/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bidirectional type equality. Used to prove `z.infer` of a twin matches
 * `t.TypeOf` of the io-ts original. A mismatch fails typecheck, not a runtime test.
 */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

export type Expect<T extends true> = T;

/** Requires every property of `T` to be `true` without needing a string index signature. */
export type ExpectAllTrue<T extends { [K in keyof T]: true }> = T;

export type MutuallyAssignable<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;

/**
 * Drops the `{ [k: string]: unknown }` catchall `z.looseObject` adds, so we can
 * compare against `t.TypeOf` which only names the known fields.
 */
export type KnownKeys<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends readonly (infer U)[]
  ? Array<KnownKeys<U>>
  : T extends object
  ? { [K in keyof T as string extends K ? never : K]: KnownKeys<T[K]> }
  : T;
