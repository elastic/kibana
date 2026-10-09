/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { deriveWorkerChainTimeoutMs } from './src/example_selection';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The experiment runs one chain at a time (WORKER_CHAIN_EXPERIMENT_CONCURRENCY),
  // so the single test covers every selected example (WORKER_CHAIN_EXAMPLES) times
  // EVAL_REPETITIONS back to back: selected x repetitions x the per-chain bound
  // (constants.ts). A ceiling, not a target. CI is deliberately not resized: the
  // Buildkite step is capped at 120 min (run_suite.sh:240) and this suite sets no
  // stepTimeoutInMinutes in evals.suites.json, so it is run on a controller with
  // WORKER_CHAIN_EXAMPLES=smoke6, not as a full-set CI gate.
  timeout: deriveWorkerChainTimeoutMs(),
});
