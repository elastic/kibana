/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, mergeWith } from 'lodash';

type DeepOverwrite<T, U> = T extends Record<string, any>
  ? Omit<T, keyof U> & {
      [TKey in keyof U]: T extends Record<TKey, any> ? DeepOverwrite<T[TKey], U[TKey]> : U[TKey];
    }
  : U;

type DeepPartialPlainObjects<T> = T extends Record<string, any>
  ? Partial<{
      [TKey in keyof T]: DeepPartialPlainObjects<T[TKey]>;
    }>
  : T;

function mergePlainObjectsOnly<T, U>(val: T, src: U): DeepOverwrite<T, U> {
  if (isPlainObject(src)) {
    return mergeWith({}, val, src, mergePlainObjectsOnly) as DeepOverwrite<T, U>;
  }
  return src as DeepOverwrite<T, U>;
}

export function extendProps<
  T extends Record<string, any> | undefined,
  U extends DeepPartialPlainObjects<T>
>(props: T, extension: U): DeepOverwrite<T, U> {
  return mergePlainObjectsOnly(props, extension);
}
