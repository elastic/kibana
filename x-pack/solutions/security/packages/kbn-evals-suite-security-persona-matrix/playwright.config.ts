/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

// Default 30min covers a single-pass 21-example run (frontier models finish in
// single-digit minutes; a local vLLM L4 can take 45+). Determinism runs with
// EVAL_REPETITIONS=3 triple the workload (~90min); allow raising the ceiling
// from the environment instead of editing the config per-run.
const TIMEOUT_MINUTES = Number(process.env.PERSONA_MATRIX_TIMEOUT_MINUTES) || 30;

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The co-located Attack Discovery spec runs under its own config
  // (attack_discovery.playwright.config.ts) with the evals_tracing server config.
  testIgnore: '**/attack_discovery.spec.ts',
  timeout: TIMEOUT_MINUTES * 60_000,
});
