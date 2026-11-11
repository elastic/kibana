/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_POLL_INTERVAL_MS = 500;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function pollUntilTrue(
  fn: () => Promise<boolean>,
  options: { timeoutMs: number; intervalMs?: number; label?: string }
): Promise<void> {
  const { timeoutMs, intervalMs = DEFAULT_POLL_INTERVAL_MS, label } = options;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) {
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error(label ?? `pollUntilTrue timed out after ${timeoutMs}ms`);
}
