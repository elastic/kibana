/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Runs asynchronous work with a bounded worker pool while preserving input order. */
export const mapBounded = async <Input, Output>(
  values: readonly Input[],
  concurrency: number,
  worker: (value: Input) => Promise<Output>
): Promise<readonly Output[]> => {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error('Bounded map concurrency must be a positive integer.');
  }
  /** Slots retain deterministic output positions while workers finish out of order. */
  const results: Output[] = new Array(values.length);
  /** Shared next index is safe because JavaScript advances it synchronously before await. */
  let nextIndex = 0;
  /** Drains the shared input queue without exceeding the caller-selected concurrency. */
  const runWorker = async (): Promise<void> => {
    for (;;) {
      /** Claims one input synchronously before starting asynchronous work. */
      const index = nextIndex++;
      if (index >= values.length) return;
      results[index] = await worker(values[index]);
    }
  };
  /** Empty input creates no workers; all other input uses at most the configured bound. */
  const workerCount = Math.min(concurrency, values.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
};
