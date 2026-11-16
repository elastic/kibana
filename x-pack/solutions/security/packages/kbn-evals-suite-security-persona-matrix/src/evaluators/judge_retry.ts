/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Retry budget for an invalid verdict. Each attempt re-sends a submission of up to hundreds
 * of thousands of characters, so one correction chance is all the cost justifies.
 * `executeUntilValid` starts its counter at `maxRetries + 1` and only gives up once it has
 * reached 0, so it makes `maxRetries + 2` calls in total: 0 means at most 2 judge calls
 * (the initial one plus one retry), where the previous 3 meant 5.
 */
export const JUDGE_MAX_RETRIES = 0;

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
