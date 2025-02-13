/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type PromiseResolvedValue<T extends Promise<any>> = T extends Promise<infer Value>
  ? Value
  : never;

/**
 * Deeply convert a immutable type (those with `readonly` properties) to a mutable type
 */
export type DeepMutable<T> = T extends Record<any, any>
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

/**
 * Ensure that a given type includes all of its key, even if they are optional (value can still be `undefined`)
 *
 * @example
 * interface Foo {
 *   one?: number;
 *   two: number;
 * }
 * const missingKeys: Foo = { two: 2 }; // ok
 *
 * const shouldHaveAllKeys: WithAllKeys<Foo> = { two: 2 }; // TS Error
 *
 * const withAllKeys: WithAllKeys<Foo> = {
 *    one: undefined, // All good now
 *    two: 2
 * }
 */
export type WithAllKeys<T extends object> = {
  [k in keyof Required<T>]: T[k];
};
