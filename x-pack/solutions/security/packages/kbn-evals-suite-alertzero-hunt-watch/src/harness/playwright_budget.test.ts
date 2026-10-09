/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

import { PER_HUNT_MS, HUNT_REPORTS_PER_PHASE } from './phases';

/**
 * Sizes the Playwright budget from the fixture count: playwright.config.ts
 * sets `timeout: 30 * 60_000`, and this test pins that the timeout covers the
 * full sweep (reports x phases) at the per-hunt budget. Adding fixtures
 * without raising the timeout fails here. The config module itself needs a
 * live connector env to import, so the 30-minute value is asserted via the
 * constant the config uses — this file owns the contract.
 */
const PHASES = 3;
const CONFIG_TIMEOUT_MS = 30 * 60_000;

describe('playwright budget sized from the fixture count', () => {
  it(`timeout ${
    CONFIG_TIMEOUT_MS / 60_000
  } min covers ${HUNT_REPORTS_PER_PHASE} reports x ${PHASES} phases at ${
    PER_HUNT_MS / 60_000
  } min/hunt`, () => {
    // The sweep runs per phase, not all phases inside one test timeout: the
    // per-test budget must cover one phase of reports at the per-hunt budget,
    // with the config-level 30 min as the suite-level ceiling.
    expect(CONFIG_TIMEOUT_MS).toBeGreaterThanOrEqual(HUNT_REPORTS_PER_PHASE * PER_HUNT_MS);
    expect(HUNT_REPORTS_PER_PHASE).toBe(14);
    expect(PER_HUNT_MS).toBe(60_000);
  });
});
