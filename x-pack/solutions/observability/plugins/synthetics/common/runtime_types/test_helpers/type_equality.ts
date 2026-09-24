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

/** Named keys of `T`. A string index hides those keys when indexed as `[keyof T]`. */
type StripIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: KnownKeys<T[K]>;
};

/**
 * Drops the `{ [k: string]: unknown }` catchall `z.looseObject` adds.
 * A real record has no named keys, so its index signature stays.
 */
export type KnownKeys<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends readonly (infer U)[]
  ? Array<KnownKeys<U>>
  : T extends object
  ? keyof StripIndex<T> extends never
    ? string extends keyof T
      ? Record<string, KnownKeys<T[string]>>
      : number extends keyof T
      ? Record<number, KnownKeys<T[number]>>
      : StripIndex<T>
    : StripIndex<T>
  : T;
