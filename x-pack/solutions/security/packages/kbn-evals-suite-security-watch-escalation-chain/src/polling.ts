/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bounded re-reads for assertions that depend on a write landing asynchronously
 * (a nested worker's proposal, a durable record, a timeline event).
 *
 * A single read after a fixed `setTimeout` is a race: slow models or a loaded
 * CI box persist the expected document after the sleep, and the spec fails
 * intermittently even though it has a 15-minute budget. Polling to a deadline
 * replaces the guess with a bound.
 */

export interface PollUntilParams<T> {
  /** Subject of the wait, used verbatim in the timeout error. */
  description: string;
  attempt: () => Promise<T>;
  until: (value: T) => boolean;
  timeoutMs?: number;
  intervalMs?: number;
  /** Injectable clock/sleep so tests do not wait on real time. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export class PollTimeoutError<T> extends Error {
  public readonly description: string;
  public readonly timeoutMs: number;
  /** Last value observed, so a caller can still assert on partial progress. */
  public readonly lastValue: T | undefined;

  constructor({
    description,
    timeoutMs,
    lastValue,
  }: {
    description: string;
    timeoutMs: number;
    lastValue: T | undefined;
  }) {
    super(`${description} did not become true within ${timeoutMs}ms`);
    this.name = 'PollTimeoutError';
    this.description = description;
    this.timeoutMs = timeoutMs;
    this.lastValue = lastValue;
  }
}

export const pollUntil = async <T>({
  description,
  attempt,
  until,
  timeoutMs = 60_000,
  intervalMs = 2_000,
  now = Date.now,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}: PollUntilParams<T>): Promise<T> => {
  const deadline = now() + timeoutMs;
  let lastValue: T | undefined;

  for (;;) {
    lastValue = await attempt();
    if (until(lastValue)) return lastValue;

    // Stop before sleeping past the deadline, so a poll never runs a whole
    // interval beyond the bound it advertises.
    if (now() + intervalMs > deadline) {
      throw new PollTimeoutError({ description, timeoutMs, lastValue });
    }

    await sleep(intervalMs);
  }
};
