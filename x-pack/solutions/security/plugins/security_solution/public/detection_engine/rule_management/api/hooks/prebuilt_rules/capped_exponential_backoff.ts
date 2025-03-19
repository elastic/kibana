/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_BACKOFF = 30000;

/**
 * Calculates a backoff delay using an exponential growth formula, capped by a
 * predefined maximum value.
 *
 * @param failedAttempts - The number of consecutive failed attempts.
 * @returns The calculated backoff delay, in milliseconds.
 */
export const cappedExponentialBackoff = (failedAttempts: number) => {
  const backoff = Math.min(1000 * 2 ** failedAttempts, MAX_BACKOFF);
  return backoff;
};
