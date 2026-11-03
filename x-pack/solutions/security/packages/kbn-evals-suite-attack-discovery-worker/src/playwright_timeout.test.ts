/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKER_SCENARIOS } from '../datasets/worker_rows';
import {
  getPlaywrightTestTimeoutMs,
  REVIEW_SETTLE_TIMEOUT_MS,
  RUNNER_TIMEOUT_MS,
} from './constants';

describe('getPlaywrightTestTimeoutMs', () => {
  it('covers every dataset row hitting both of the suite timeouts', () => {
    const worstCaseMs = WORKER_SCENARIOS.length * (RUNNER_TIMEOUT_MS + REVIEW_SETTLE_TIMEOUT_MS);

    expect(getPlaywrightTestTimeoutMs(WORKER_SCENARIOS.length)).toBeGreaterThan(worstCaseMs);
  });

  it('grows with the row count', () => {
    expect(getPlaywrightTestTimeoutMs(2)).toBeGreaterThan(getPlaywrightTestTimeoutMs(1));
  });
});
