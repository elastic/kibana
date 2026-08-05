/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

// `_run_soon` reports success as `204 No Content` but surfaces retryable scheduling
// conflicts (the reschedule raced the rule's in-flight execution) as `200` with one of
// these messages; retrying until 204 ensures the run is actually scheduled.
const RETRYABLE_RUN_SOON_MESSAGES = ['Rule is already running', 'task scheduling conflicted'];
const RUN_SOON_MAX_ATTEMPTS = 20;
const RUN_SOON_RETRY_DELAY_MS = 500;

/**
 * Triggers a run for a rule using the `_run_soon` API, retrying while the response is a
 * retryable scheduling conflict so callers don't wait for an execution that never happens.
 */
export const runSoonRule = async (supertest: SuperTest.Agent, ruleId: string): Promise<void> => {
  for (let attempt = 1; attempt <= RUN_SOON_MAX_ATTEMPTS; attempt++) {
    const response = await supertest
      .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'kibana')
      .set('elastic-api-version', '2023-10-31');

    if (response.status === 204) {
      return;
    }

    const message = response.text ?? '';
    const isRetryable =
      response.status === 200 &&
      RETRYABLE_RUN_SOON_MESSAGES.some((retryable) => message.includes(retryable));

    if (!isRetryable) {
      throw new Error(
        `Unexpected _run_soon response for rule ${ruleId}: ${response.status} ${message}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, RUN_SOON_RETRY_DELAY_MS));
  }

  throw new Error(
    `_run_soon did not schedule rule ${ruleId} after ${RUN_SOON_MAX_ATTEMPTS} attempts`
  );
};
