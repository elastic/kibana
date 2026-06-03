/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export interface RetryOptions {
  timeoutMs: number;
  intervalMs: number;
  /** Identifies which wait failed when the deadline is reached. */
  label: string;
}

/**
 * Retry `block` until it resolves without throwing, or the timeout elapses —
 * the API-spec analogue of FTR's retry service. Any block of requests /
 * `expect` assertions can be wrapped, and transient failures (an ES 4xx while
 * the cluster is still starting, a connection reset, an assertion that is not
 * true yet) are retried instead of failing on the first attempt. The last error
 * is re-thrown with the `label` for context once the deadline passes.
 *
 * The Scout `/api` `expect` does not expose Playwright's retrying `toPass` /
 * `expect.poll`, so API specs use this for eventual-consistency waits.
 */
export async function retryForSuccess<T>(
  block: () => Promise<T>,
  { timeoutMs, intervalMs, label }: RetryOptions
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;
  while (Date.now() < deadline) {
    try {
      return await block();
    } catch (e) {
      // Keep retrying through transient errors; the latest one is surfaced
      // with the label if we never succeed.
      lastError = e instanceof Error ? e : new Error(String(e));
    }
    await sleep(intervalMs);
  }
  throw new Error(
    `[${label}] timed out after ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ''}`
  );
}

/**
 * Convenience wrapper around `retryForSuccess` for the common "poll until a
 * condition is true" case. Shares the same retry loop, so it also retries
 * through transient errors thrown by `fn`.
 */
export async function pollUntilTrue(
  fn: () => Promise<boolean>,
  options: RetryOptions
): Promise<void> {
  await retryForSuccess(async () => {
    if (!(await fn())) {
      throw new Error('condition is not true yet');
    }
  }, options);
}
