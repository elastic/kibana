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

export async function pollUntilTrue(
  fn: () => Promise<boolean>,
  options: { timeoutMs: number; intervalMs: number; label?: string }
): Promise<void> {
  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) {
      return;
    }
    await sleep(options.intervalMs);
  }
  throw new Error(options.label ?? `pollUntilTrue timed out after ${options.timeoutMs}ms`);
}
