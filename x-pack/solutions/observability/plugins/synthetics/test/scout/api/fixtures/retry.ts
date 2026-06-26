/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal port of the FTR `retry.tryForTime` helper for Scout API specs.
 *
 * Repeatedly invokes `fn` until it resolves without throwing, or until
 * `timeoutMs` elapses (in which case the last error is rethrown). Used to wait
 * out asynchronous Fleet package-policy propagation in the synthetics suites.
 */
export async function tryForTime<T>(
  timeoutMs: number,
  fn: () => Promise<T>,
  { intervalMs = 1000 }: { intervalMs?: number } = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  do {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } while (Date.now() < deadline);
  throw lastError;
}

/** Sleep helper used to mirror the FTR fixed `setTimeout` waits. */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
