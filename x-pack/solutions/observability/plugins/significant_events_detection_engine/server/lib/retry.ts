/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStatusCode } from './errors';

/** Statuses a busy or restarting cluster answers with; anything else will not get better. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Retries an Elasticsearch call that failed because the cluster was busy, with exponential
 * backoff. A write that fails for any other reason fails at once.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500 }: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    // A loop rather than recursion keeps the stack flat and the attempt count explicit.
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = getStatusCode(error);
      if (status === undefined || !RETRYABLE_STATUSES.has(status) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}
