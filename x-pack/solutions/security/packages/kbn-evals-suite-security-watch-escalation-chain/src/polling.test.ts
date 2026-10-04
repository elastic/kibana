/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pollUntil, PollTimeoutError } from './polling';

/** Deterministic clock: `sleep` advances it, so no test waits on real time. */
const fakeClock = () => {
  let current = 0;
  return {
    now: () => current,
    sleep: async (ms: number) => {
      current += ms;
    },
    advanceTo: (value: number) => {
      current = value;
    },
  };
};

describe('pollUntil', () => {
  it('returns as soon as the predicate holds, without sleeping further', async () => {
    const clock = fakeClock();
    let attempts = 0;

    const value = await pollUntil({
      description: 'detection proposal',
      attempt: async () => {
        attempts += 1;
        return attempts;
      },
      until: (n) => n >= 3,
      timeoutMs: 10_000,
      intervalMs: 1_000,
      now: clock.now,
      sleep: clock.sleep,
    });

    expect(value).toBe(3);
    expect(attempts).toBe(3);
    // Two sleeps between three attempts — not a fixed pre-read delay.
    expect(clock.now()).toBe(2_000);
  });

  it('keeps re-reading past a fixed sleep, so a late write is still observed', async () => {
    // Regression: the composite spec slept 5s once and read once, so a nested
    // Detection worker writing at 6s produced an intermittent false failure.
    const clock = fakeClock();
    const writeLandsAt = 30_000;
    let attempts = 0;

    const value = await pollUntil({
      description: 'detection proposal',
      attempt: async () => {
        attempts += 1;
        return clock.now() >= writeLandsAt ? ['detection-proposal'] : [];
      },
      until: (proposals) => proposals.length > 0,
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now: clock.now,
      sleep: clock.sleep,
    });

    expect(value).toEqual(['detection-proposal']);
    expect(clock.now()).toBeGreaterThanOrEqual(writeLandsAt);
  });

  it('throws PollTimeoutError with the last observed value when the deadline passes', async () => {
    const clock = fakeClock();

    let caught: unknown;
    try {
      await pollUntil({
        description: 'detection proposal',
        attempt: async () => ['floor-proposal'],
        until: () => false,
        timeoutMs: 12_000,
        intervalMs: 5_000,
        now: clock.now,
        sleep: clock.sleep,
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(PollTimeoutError);
    const error = caught as PollTimeoutError<string[]>;
    expect(error.description).toBe('detection proposal');
    expect(error.timeoutMs).toBe(12_000);
    // The partial result stays available so the caller can still assert on it
    // instead of losing the diagnosis.
    expect(error.lastValue).toEqual(['floor-proposal']);
    expect(error.message).toContain('did not become true within 12000ms');
  });

  it('never exceeds the deadline by more than one attempt', async () => {
    const clock = fakeClock();
    let attempts = 0;

    await pollUntil({
      description: 'anything',
      attempt: async () => {
        attempts += 1;
        return attempts;
      },
      until: () => false,
      timeoutMs: 10_000,
      intervalMs: 3_000,
      now: clock.now,
      sleep: clock.sleep,
    }).catch(() => undefined);

    // 0s, 3s, 6s, 9s attempts; the 9s check refuses to sleep past the 10s
    // deadline.
    expect(attempts).toBe(4);
  });
});
