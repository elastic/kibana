/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Nullable<T> = T | null | undefined;

export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

export const mapNullable = <A, B>(value: Nullable<A>, fn: (val: A) => B): Nullable<B> => {
  if (value === null || value === undefined) {
    return undefined;
  }
  return fn(value);
};

export const map = mapNullable;
