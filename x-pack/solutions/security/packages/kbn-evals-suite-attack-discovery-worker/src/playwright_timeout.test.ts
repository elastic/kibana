/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKER_SCENARIOS } from '../datasets/worker_rows';
import {
  FLOOR_IDLE_WAIT_MS,
  FLOOR_TICK_CANCEL_TIMEOUT_MS,
  getPlaywrightTestTimeoutMs,
  REVIEW_SETTLE_TIMEOUT_MS,
  RUNNER_TIMEOUT_MS,
} from './constants';

// Each floor-parent run: idle wait for the floor and its child, plus the cancel settle.
const FLOOR_PARENT_RUN_WAITS_MS = 2 * FLOOR_IDLE_WAIT_MS + FLOOR_TICK_CANCEL_TIMEOUT_MS;

describe('getPlaywrightTestTimeoutMs', () => {
  it('covers every dataset row hitting both of the suite timeouts', () => {
    const worstCaseMs = WORKER_SCENARIOS.length * (RUNNER_TIMEOUT_MS + REVIEW_SETTLE_TIMEOUT_MS);

    expect(getPlaywrightTestTimeoutMs(WORKER_SCENARIOS.length)).toBeGreaterThan(worstCaseMs);
  });

  it('covers a row that waits for the runner and then for two reviews in a row', () => {
    const worstRowMs = RUNNER_TIMEOUT_MS + 2 * REVIEW_SETTLE_TIMEOUT_MS;

    expect(getPlaywrightTestTimeoutMs(1)).toBeGreaterThan(worstRowMs);
    // The second review wait and the waits of the two floor-parent rows (review and large batch)
    // are paid once, not per row.
    expect(getPlaywrightTestTimeoutMs(2) - getPlaywrightTestTimeoutMs(1)).toBe(
      getPlaywrightTestTimeoutMs(1) - REVIEW_SETTLE_TIMEOUT_MS - 2 * FLOOR_PARENT_RUN_WAITS_MS
    );
  });

  it('covers the floor settle wait of every row and the waits of both floor-parent rows', () => {
    const rowMs = RUNNER_TIMEOUT_MS + REVIEW_SETTLE_TIMEOUT_MS + FLOOR_IDLE_WAIT_MS;

    expect(getPlaywrightTestTimeoutMs(1)).toBeGreaterThan(
      rowMs + REVIEW_SETTLE_TIMEOUT_MS + 2 * FLOOR_PARENT_RUN_WAITS_MS
    );
  });

  it('scales linearly with the repetitions', () => {
    expect(getPlaywrightTestTimeoutMs(8, 15)).toBe(15 * getPlaywrightTestTimeoutMs(8));
    expect(getPlaywrightTestTimeoutMs(8, 1)).toBe(getPlaywrightTestTimeoutMs(8));
  });

  it('grows with the row count', () => {
    expect(getPlaywrightTestTimeoutMs(2)).toBeGreaterThan(getPlaywrightTestTimeoutMs(1));
  });
});
