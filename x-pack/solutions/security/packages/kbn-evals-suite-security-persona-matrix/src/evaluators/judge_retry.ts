/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';

/**
 * Retry budget for an invalid verdict. Each attempt re-sends a submission of up to hundreds
 * of thousands of characters, so one correction chance is all the cost justifies.
 * `executeUntilValid` starts its counter at `maxRetries + 1` and only gives up once it has
 * reached 0, so it makes `maxRetries + 2` calls in total: 0 means at most 2 judge calls
 * (the initial one plus one retry), where the previous 3 meant 5.
 */
export const JUDGE_MAX_RETRIES = 0;

const messageOf = (value: unknown): string =>
  value instanceof Error ? value.message : String(value);

/**
 * `executeUntilValid` words its give-up AggregateError as "in ${maxRetries + 1} attempts", which
 * undercounts by one (see above). Rebuilds it with the real call count and the judge's last
 * rejection reason; any other error keeps its own message.
 */
export const describeJudgeFailure = (error: unknown): string => {
  if (!(error instanceof AggregateError)) return messageOf(error);
  const lastRejection = error.errors[error.errors.length - 1];
  const calls = JUDGE_MAX_RETRIES + 2;
  return `LLM could not complete task successfully in ${calls} attempts${
    error.errors.length ? `; last rejection: ${messageOf(lastRejection)}` : ''
  }`;
};

/**
 * Wraps a bound client so every `prompt` call (one judge call each, retries included) is counted.
 * The judge's cost is otherwise invisible: a score from a retried verdict looks like any other.
 */
export const countingJudgeClient = (
  inferenceClient: BoundInferenceClient
): { client: BoundInferenceClient; calls: () => number } => {
  let calls = 0;
  const client: BoundInferenceClient = Object.create(inferenceClient);
  client.prompt = ((...args: Parameters<BoundInferenceClient['prompt']>) => {
    calls++;
    return inferenceClient.prompt(...args);
  }) as BoundInferenceClient['prompt'];
  return { client, calls: () => calls };
};

/** Logs a warning without letting a failing logger break a judge that promises not to throw. */
export const warnSafely = (
  log: { warning: (message: string) => void } | undefined,
  message: string
) => {
  try {
    log?.warning(message);
  } catch {
    // a broken logger must not turn a graceful "unavailable" into a rejected judge
  }
};

/**
 * `executeUntilValid` forwards a rejected `grade` callback to the judge as
 * `{ error: <thrown value> }`, and the OpenAI adapter `JSON.stringify`s that. A plain `Error`
 * serializes to `{}` (its `message` is not enumerable), so the judge would retry blind.
 * `toJSON` makes the message the one thing that does survive.
 */
export class InvalidVerdictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVerdictError';
  }

  toJSON(): { message: string } {
    return { message: this.message };
  }
}
