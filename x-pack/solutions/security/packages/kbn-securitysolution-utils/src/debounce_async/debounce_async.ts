/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unlike lodash's debounce, which resolves intermediate calls with the most
 * recent value, this implementation waits to resolve intermediate calls until
 * the next invocation resolves.
 *
 * @param fn an async function
 *
 * @returns A debounced async function that resolves on the next invocation
 */
export function debounceAsync<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  intervalMs: number
): (...args: Args) => Promise<Awaited<Result>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let resolve: (value: Awaited<Result>) => void;
  let promise = new Promise<Awaited<Result>>((_resolve) => {
    resolve = _resolve;
  });

  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      resolve(await fn(...args));
      promise = new Promise((_resolve) => {
        resolve = _resolve;
      });
    }, intervalMs);

    return promise;
  };
}
