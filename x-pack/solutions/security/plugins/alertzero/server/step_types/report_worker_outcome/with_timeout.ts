/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Settles like `promise`, or rejects once `timeoutMs` elapses or `abortSignal` aborts first. It
 * stops waiting; it cannot cancel `promise`, whose API may not accept a signal.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  abortSignal?: AbortSignal
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  let onAbort: (() => void) | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    if (abortSignal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    onAbort = () => reject(new Error('Aborted'));
    abortSignal?.addEventListener('abort', onAbort, { once: true });
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
    if (onAbort) {
      abortSignal?.removeEventListener('abort', onAbort);
    }
  });
};
