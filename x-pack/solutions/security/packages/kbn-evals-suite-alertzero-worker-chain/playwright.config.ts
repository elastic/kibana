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
  // (constants.ts). A ceiling, not a target. Buildkite runs refuse to start
  // past the step budget (assertWorkerChainFitsCiBudget); run it locally with
  // `WORKER_CHAIN_EXAMPLES=smoke6 node scripts/evals start --suite <id>`.
  timeout: deriveWorkerChainTimeoutMs(),
});
