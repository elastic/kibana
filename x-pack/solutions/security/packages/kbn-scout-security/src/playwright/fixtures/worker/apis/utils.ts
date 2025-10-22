/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutLogger } from '@kbn/scout';

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  exponentialBackoff?: boolean;
}

export interface PollResult<T> {
  data: T;
  attempts: number;
  totalWaitMs: number;
}

/**
 * Retries an async operation with configurable attempts and delay
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @param log - Scout logger for debugging
 * @returns The result of the successful operation
 * @throws The last error if all retry attempts fail
 */
export async function retryApiCall<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  log?: ScoutLogger
): Promise<T> {
  const { maxAttempts = 3, delayMs = 2000, exponentialBackoff = false } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log?.debug(`[RETRY] Attempt ${attempt}/${maxAttempts}`);
      const result = await operation();
      if (attempt > 1) {
        log?.debug(`[RETRY] Operation succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      log?.debug(`[RETRY] Attempt ${attempt}/${maxAttempts} failed: ${error}`);

      if (attempt < maxAttempts) {
        const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        log?.debug(`[RETRY] Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  log?.error(`[RETRY] All ${maxAttempts} attempts failed`);
  throw lastError || new Error(`All ${maxAttempts} retry attempts failed`);
}

/**
 * Gets polling configuration from environment variables with defaults
 * Defaults match Cypress pattern: 5s interval, 15s timeout (3 attempts)
 *
 * Environment variables:
 * - SCOUT_POLL_INTERVAL_MS: Time between poll attempts (default: 5000)
 * - SCOUT_POLL_TIMEOUT_MS: Total timeout before failure (default: 15000)
 * - SCOUT_POLL_MAX_ATTEMPTS: Max attempts (calculated from timeout/interval if not set)
 *
 * @returns Poll configuration with intervalMs, timeoutMs, and maxAttempts
 */
function getPollConfig(
  options: PollOptions = {}
): Required<Omit<PollOptions, 'exponentialBackoff'>> & { exponentialBackoff: boolean } {
  const intervalMs =
    options.intervalMs ?? parseInt(process.env.SCOUT_POLL_INTERVAL_MS || '5000', 10);
  const timeoutMs = options.timeoutMs ?? parseInt(process.env.SCOUT_POLL_TIMEOUT_MS || '15000', 10);
  const maxAttempts =
    options.maxAttempts ??
    parseInt(process.env.SCOUT_POLL_MAX_ATTEMPTS || String(Math.ceil(timeoutMs / intervalMs)), 10);
  const exponentialBackoff = options.exponentialBackoff ?? false;

  return { intervalMs, timeoutMs, maxAttempts, exponentialBackoff };
}

/**
 * Polls an operation until it succeeds or times out
 * This is the Scout equivalent of Cypress's cy.waitUntil() pattern
 *
 * @param operation - The async operation to poll (should throw/return falsy if not ready)
 * @param options - Polling configuration options
 * @param log - Scout logger for debugging
 * @returns The result of the successful operation with metadata
 * @throws The last error if all poll attempts fail or timeout is reached
 *
 * @example
 * // Poll until a document exists
 * const result = await pollUntilAvailable(
 *   async () => {
 *     const doc = await getDocument(id);
 *     if (!doc) throw new Error('Document not found');
 *     return doc;
 *   },
 *   { intervalMs: 5000, timeoutMs: 15000 },
 *   log
 * );
 */
export async function pollUntilAvailable<T>(
  operation: () => Promise<T>,
  options: PollOptions = {},
  log?: ScoutLogger
): Promise<PollResult<T>> {
  const { intervalMs, timeoutMs, maxAttempts, exponentialBackoff } = getPollConfig(options);

  log?.debug(
    `[POLL] Starting poll with interval=${intervalMs}ms, timeout=${timeoutMs}ms, maxAttempts=${maxAttempts}`
  );

  let lastError: Error | undefined;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const elapsedMs = Date.now() - startTime;

    // Check if we've exceeded the timeout
    if (elapsedMs >= timeoutMs) {
      log?.error(`[POLL] Timeout after ${elapsedMs}ms (${attempt} attempts)`);
      throw new Error(
        `Poll timeout after ${elapsedMs}ms (${attempt} attempts). Last error: ${
          lastError?.message || 'Unknown'
        }`
      );
    }

    try {
      log?.debug(`[POLL] Attempt ${attempt}/${maxAttempts} (elapsed: ${elapsedMs}ms)`);
      const result = await operation();

      // If result is falsy, treat as not ready
      if (!result) {
        throw new Error('Operation returned falsy value');
      }

      const totalWaitMs = Date.now() - startTime;
      log?.debug(`[POLL] Operation succeeded after ${attempt} attempts (${totalWaitMs}ms)`);

      return {
        data: result,
        attempts: attempt,
        totalWaitMs,
      };
    } catch (error: unknown) {
      lastError = error as Error;

      // Log different messages for different error types
      const hasResponseStatus = typeof error === 'object' && error !== null && 'response' in error;
      const responseStatus = hasResponseStatus
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      const errorMessage = error instanceof Error ? error.message : '';

      if (responseStatus === 404 || errorMessage.includes('not found')) {
        log?.debug(`[POLL] Attempt ${attempt}/${maxAttempts}: Resource not yet available (404)`);
      } else {
        log?.debug(`[POLL] Attempt ${attempt}/${maxAttempts} failed: ${errorMessage || error}`);
      }

      // If this isn't the last attempt and we haven't timed out, wait before retrying
      if (attempt < maxAttempts && Date.now() - startTime < timeoutMs) {
        const delay = exponentialBackoff ? intervalMs * Math.pow(2, attempt - 1) : intervalMs;
        const actualDelay = Math.min(delay, timeoutMs - (Date.now() - startTime));

        if (actualDelay > 0) {
          log?.debug(`[POLL] Waiting ${actualDelay}ms before next attempt...`);
          await new Promise((resolve) => setTimeout(resolve, actualDelay));
        }
      }
    }
  }

  const totalWaitMs = Date.now() - startTime;
  log?.error(`[POLL] All ${maxAttempts} attempts failed after ${totalWaitMs}ms`);
  throw new Error(
    `Poll failed after ${maxAttempts} attempts (${totalWaitMs}ms). Last error: ${
      lastError?.message || 'Unknown'
    }`
  );
}

/**
 * Polls until a document is indexed and retrievable in Elasticsearch
 * This is a specialized version of pollUntilAvailable for verifying ES document indexing
 *
 * @param getOperation - The GET operation to verify document exists (should return the document)
 * @param options - Polling configuration options
 * @param log - Scout logger for debugging
 * @returns The retrieved document with poll metadata
 * @throws Error if document is not indexed within timeout
 *
 * @example
 * // Wait for conversation to be indexed
 * const result = await pollUntilDocumentIndexed(
 *   async () => kbnClient.request({ method: 'GET', path: `/api/conversations/${id}` }),
 *   {},
 *   log
 * );
 */
export async function pollUntilDocumentIndexed<T>(
  getOperation: () => Promise<T>,
  options: PollOptions = {},
  log?: ScoutLogger
): Promise<PollResult<T>> {
  log?.debug('[POLL] Polling until document is indexed and retrievable');

  return pollUntilAvailable<T>(
    async () => {
      try {
        const result = await getOperation();
        return result;
      } catch (error: unknown) {
        // 404 means document not indexed yet - this is expected
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.response?.status === 404 || (error as any)?.status === 404) {
          throw new Error('Document not yet indexed (404)');
        }
        // Other errors should be re-thrown
        throw error;
      }
    },
    options,
    log
  );
}
