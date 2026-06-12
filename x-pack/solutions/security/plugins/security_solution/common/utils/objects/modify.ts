/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fp from 'lodash/fp';
import type { Get, IsEqual } from 'type-fest';
import type { SetProp } from './set';

/**
 * Proxy for lodash fp `update` with better type inference.
 * We use `modify` to signal that the type of the object is being modified.
 * Overloaded to support both imperative and point free style.
 */
function modify<T extends object, P extends string, A = Get<T, P>, B = A>(
  path: P,
  updater: (val: A) => B
): (
  obj: T
) => IsEqual<A, unknown | never> extends true ? `Could not find path "${P}"` : SetProp<P, B, T>;

function modify<T extends object, P extends string, A = Get<T, P>, B = A>(
  obj: T,
  path: P,
  updater: (val: A) => B
): IsEqual<A, unknown | never> extends true ? `Could not find path "${P}"` : SetProp<P, B, T>;

function modify<T extends object, P extends string, A = Get<T, P>, B = A>(
  ...args: [P, (val: A) => B] | [T, P, (val: A) => B]
) {
  if (args.length === 3) {
    const [obj, path, updater] = args;
    return fp.update(path)(updater)(obj);
  }
  const [path, updater] = args;
  return fp.update(path)(updater);
}

export { modify };
