/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Connection-level failures that carry no HTTP status: the socket closed before a
 * response arrived. Kibana's idle socket timeout (`server.socketTimeout`, 120s by
 * default) closes the connection under a judge call that waits longer than that for the
 * model, and undici reports it as `SocketError: other side closed` / `fetch failed`.
 */
const TRANSPORT_FAILURE =
  /other side closed|fetch failed|socket hang up|ECONNRESET|UND_ERR_SOCKET|EPIPE/i;

const errorStatus = (err: unknown): unknown =>
  (err as { status?: unknown; statusCode?: unknown } | null)?.status ??
  (err as { statusCode?: unknown } | null)?.statusCode;

/**
 * True only for transport failures with no HTTP status. Any HTTP response (4xx, 5xx,
 * 429) is left to the existing retry layers, which already handle statuses.
 */
export const isTransportFailure = (err: unknown): boolean => {
  if (typeof errorStatus(err) === 'number') {
    return false;
  }
  const cause = (err as { cause?: { code?: unknown; message?: unknown } } | null)?.cause;
  const text = [err instanceof Error ? err.message : String(err), cause?.code, cause?.message].join(
    ' '
  );
  return TRANSPORT_FAILURE.test(text);
};

export interface JudgeRetryOptions {
  log: Pick<ToolingLog, 'warning'>;
  /** Total tries including the first. Default 3. */
  maxAttempts?: number;
  /** Delay before the 2nd try; doubles each retry. Default 5000ms. */
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Retries an LLM-judge evaluator when its `/internal/inference/prompt` call loses the
 * connection. kbn-evals sends that call with `retries: 0` and its own handler retries
 * only on HTTP 429/503/504, so a closed socket fails the whole spec on the first try.
 * A judge call has no side effects, so running it again is safe. Code evaluators and
 * the workflow-run POST are not wrapped: re-running the latter would start a second
 * workflow execution.
 */
export const withJudgeTransportRetry = (
  evaluator: Evaluator,
  { log, maxAttempts = 3, baseDelayMs = 5000, sleep = defaultSleep }: JudgeRetryOptions
): Evaluator => ({
  ...evaluator,
  evaluate: async (params) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await evaluator.evaluate(params);
      } catch (err) {
        if (attempt >= maxAttempts || !isTransportFailure(err)) {
          throw err;
        }
        const delayMs = baseDelayMs * 2 ** (attempt - 1);
        log.warning(
          `Evaluator "${evaluator.name}" lost its connection (attempt ${attempt}/${maxAttempts}): ${
            err instanceof Error ? err.message : String(err)
          }; retrying in ${delayMs}ms`
        );
        await sleep(delayMs);
      }
    }
  },
});
