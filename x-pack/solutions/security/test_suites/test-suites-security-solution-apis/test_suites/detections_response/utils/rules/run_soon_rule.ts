/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

const RUN_SOON_TIMEOUT_MS = 60_000;
const RUN_SOON_RETRY_DELAY_MS = 250;

/**
 * Triggers a run for a rule using the `_run_soon` API, retrying until the run is actually scheduled.
 */
export const runSoonRule = async (supertest: SuperTest.Agent, ruleId: string): Promise<void> => {
  const deadline = Date.now() + RUN_SOON_TIMEOUT_MS;
  let softFailure = '';

  while (Date.now() < deadline) {
    const response = await supertest
      .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'kibana')
      .set('elastic-api-version', '2023-10-31');

    if (response.status === 204) {
      return;
    }

    if (response.status !== 200) {
      throw new Error(
        `Unexpected ${response.status} response from _run_soon for rule ${ruleId}: ${response.text}`
      );
    }

    // A 200 carries a scheduling soft failure (usually the previous run still being in flight) and
    // means nothing was scheduled, so re-posting is safe and is the retry the API asks callers for.
    softFailure = response.text;
    await new Promise((resolve) => setTimeout(resolve, RUN_SOON_RETRY_DELAY_MS));
  }

  throw new Error(
    `Timed out after ${RUN_SOON_TIMEOUT_MS}ms waiting for _run_soon to schedule a run for rule ${ruleId}. Last response: ${softFailure}`
  );
};
