/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { Logger } from '@kbn/core/server';

// Six waits of 2s doubling to 64s span just over two minutes, so a dependency that is merely slow
// to come up on a freshly booted deployment is covered without retrying a real fault forever.
const DEFAULT_MAX_ATTEMPTS = 7;
const DEFAULT_BASE_DELAY_MS = 2000;

export interface RetryWithBackoffOptions {
  logger: Logger;
  /** Completes "failed to ..." in the retry log line. */
  description: string;
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * Runs `fn`, retrying a rejection with exponential backoff until it resolves or `maxAttempts` is
 * spent, in which case the last error is rethrown.
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  {
    logger,
    description,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
  }: RetryWithBackoffOptions
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }
      const delayMs = Math.pow(2, attempt - 1) * baseDelayMs;
      logger.warn(
        `significantEvents: failed to ${description} -- retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      await setTimeout(delayMs);
    }
  }
};
