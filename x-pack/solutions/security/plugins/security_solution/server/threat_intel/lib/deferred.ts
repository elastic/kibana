/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: unknown) => void;
}

/**
 * A promise whose `resolve`/`reject` are exposed so a later lifecycle phase can
 * settle it. Threat intel routes register in `setup()` but their one-time
 * bootstrap resolves in `start()`; handlers await this promise so a request in
 * that window cannot touch a plugin-owned index before its template applies.
 */
export const createDeferred = (): Deferred => {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
