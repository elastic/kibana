/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { WORKER_SCENARIOS } from './datasets/worker_rows';
import { getPlaywrightTestTimeoutMs } from './src/constants';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Rows share one space and run serially, and the test timeout below is sized for one pass over
  // them, so a repeat (EVAL_REPETITIONS or `--repetitions` override this) can time the test out.
  repetitions: 1,
  // The runner's concurrency key is per space (`cancel-in-progress`, max 1), so a second
  // concurrent trigger in the eval space cancels the first. Rows run one at a time.
  workers: 1,
  // One test runs every row, and a row may take up to its runner plus review timeouts.
  timeout: getPlaywrightTestTimeoutMs(WORKER_SCENARIOS.length),
});
