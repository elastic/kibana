/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** How one call settled and how long it took, in fractional milliseconds of monotonic time. */
export interface TimedOutcome<T> {
  outcome: PromiseSettledResult<T>;
  wallMs: number;
}

/**
 * Runs `run` and settles it, never rejecting, timing it from the call until this continuation
 * resumes, so `wallMs` includes any event-loop delay from other work, not network time alone.
 */
export const settleTimed = async <T>(run: () => Promise<T>): Promise<TimedOutcome<T>> => {
  const startedAt = performance.now();
  try {
    const value = await run();
    return { outcome: { status: 'fulfilled', value }, wallMs: performance.now() - startedAt };
  } catch (reason) {
    return { outcome: { status: 'rejected', reason }, wallMs: performance.now() - startedAt };
  }
};
