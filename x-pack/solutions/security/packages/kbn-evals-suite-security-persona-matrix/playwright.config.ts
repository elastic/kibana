/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig, resolveRepetitions } from '@kbn/evals';

// 30min covers one pass over the 21 examples (frontier models finish in
// single-digit minutes; a local vLLM L4 can take 45+). Every repetition re-runs
// the whole pass, so the default scales with the repetition tier: smoke (n=1)
// 30min, confirm (n=3) 90min, publish (n=5) 150min.
const PASS_MINUTES = 30;
const TIMEOUT_MINUTES =
  Number(process.env.PERSONA_MATRIX_TIMEOUT_MINUTES) ||
  PASS_MINUTES * resolveRepetitions(process.env);

// Examples are network-bound on the model under test, so the default single
// worker leaves the box mostly idle. Opt in per-run rather than raising the
// default: `beforeAll` seeds shared indices that `afterAll` deletes, so extra
// workers inside one suite tear down data the others are still using. Safe
// only when each worker gets its own stack.
const WORKERS = Number(process.env.PERSONA_MATRIX_WORKERS);

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The co-located Attack Discovery spec runs under its own config
  // (attack_discovery.playwright.config.ts) with the evals_tracing server config.
  testIgnore: '**/attack_discovery.spec.ts',
  timeout: TIMEOUT_MINUTES * 60_000,
  workers: WORKERS === 2 || WORKERS === 3 ? WORKERS : 1,
});
