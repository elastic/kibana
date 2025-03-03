/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fp from 'lodash/fp';

import type { IsEqual, Get, EmptyObject } from 'type-fest';
import type { Expand } from './types';

type Path = string | readonly string[];

/** Proxy for lodash fp `set` with better type inference. Overloaded to support both imperative and point free style.
 *
 * If an invalid path is passed, the type of the `value` parameter is `never` which should cause a type error.
 * Do **not** do an `as never` assertion to get around this, but instead make sure that the path is correct.
 *
 * Dynamic paths is supported if an array is passed as `path`.
 * If an array is passed as `path`, it needs to be `const`: `["foo", "bar"] as const`
 */
function set<T extends object, P extends Path, V extends Get<T, P>>(
  path: P,
  value: IsEqual<Get<T, P>, unknown> extends true ? never : V
): (obj: T) => IsEqual<Get<T, P>, unknown> extends true ? unknown : T;

function set<T extends object, P extends Path, V extends Get<T, P>>(
  obj: T,
  path: P,
  value: IsEqual<Get<T, P>, unknown> extends true ? never : V
): IsEqual<Get<T, P>, unknown> extends true ? unknown : T;

function set<T extends object, P extends Path, V extends Get<T, P>>(...args: [P, V] | [T, P, V]) {
  if (args.length === 3) {
    const [obj, path, value] = args;
    return fp.set(path)(value)(obj);
  }
  const [path, value] = args;
  return fp.set(path)(value);
}

export { set };

export type SetProp<P extends string, V, T extends object> = Expand<
  P extends `${infer K}.${infer Tail}`
    ? K extends keyof T
      ? { [k in keyof T]: k extends K ? SetProp<Tail, V, EmptyObject> : T[k] }
      : { [k in K]: SetProp<Tail, V, EmptyObject> } & (T extends EmptyObject ? {} : T)
    : P extends keyof T
    ? { [k in keyof T]: k extends P ? V : T[k] }
    : { [k in P]: V } & (T extends EmptyObject ? {} : T)
>;

export function setProp<T extends object, P extends string, V>(
  obj: T,
  path: P,
  value: V
): SetProp<P, V, T>;
export function setProp<T extends object, P extends string, V>(
  path: P,
  value: V
): (obj: T) => SetProp<P, V, T>;
export function setProp<T extends object, P extends string, V>(...args: [T, P, V] | [P, V]) {
  if (args.length === 3) {
    const [obj, path, value] = args;
    return fp.set(path, value)(obj);
  }
  const [path, value] = args;
  return (obj: T) => fp.set(path, value)(obj);
}
