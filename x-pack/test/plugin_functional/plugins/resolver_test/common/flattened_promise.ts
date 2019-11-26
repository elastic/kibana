/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface FlattenedPromise<T = unknown> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T> | undefined) => void;
  reject: (reason?: any) => void;
}

export function flattenedPromise<T = unknown>(): FlattenedPromise<T> {
  const returnValue: Partial<FlattenedPromise<T>> = {};
  returnValue.promise = new Promise<T>(function(resolve, reject) {
    returnValue.resolve = resolve;
    returnValue.reject = reject;
  });
  return returnValue as FlattenedPromise<T>;
}
