/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fp from 'lodash/fp';
import type { Get, IsEqual } from 'type-fest';

type UpdaterFn<T extends object, P extends string, V extends Get<T, P>> = (
  val: IsEqual<Get<T, P>, unknown> extends true ? never : V
) => IsEqual<Get<T, P>, unknown> extends true ? never : V;

/**
 * Proxy for lodash fp `update` with better type inference.
 * Overloaded to support both imperative and point free style.
 */
function update<T extends object, P extends string, V extends Get<T, P>>(
  path: P,
  updater: UpdaterFn<T, P, V>
): (obj: T) => IsEqual<Get<T, P>, unknown> extends true ? unknown : T;

function update<T extends object, P extends string, V extends Get<T, P>>(
  obj: T,
  path: P,
  updater: UpdaterFn<T, P, V>
): IsEqual<Get<T, P>, unknown> extends true ? unknown : T;

function update<T extends object, P extends string, V extends Get<T, P>>(
  ...args: [P, UpdaterFn<T, P, V>] | [T, P, UpdaterFn<T, P, V>]
) {
  if (args.length === 3) {
    const [obj, path, updater] = args;
    return fp.update(path)(updater)(obj);
  }
  const [path, updater] = args;
  return fp.update(path)(updater);
}

export { update };
