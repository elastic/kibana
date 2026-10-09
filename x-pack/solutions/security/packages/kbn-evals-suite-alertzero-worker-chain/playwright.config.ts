/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { WORKER_CHAIN_EXAMPLE_COUNT, WORKER_CHAIN_MAX_CHAIN_MS } from './src/constants';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The experiment runs one chain at a time (WORKER_CHAIN_EXPERIMENT_CONCURRENCY),
  // so the single test covers every example back to back. Sized from the per-hop
  // caps (constants.ts) so 21 serial chains fit; it is a ceiling, not a target.
  timeout: WORKER_CHAIN_EXAMPLE_COUNT * WORKER_CHAIN_MAX_CHAIN_MS,
});
