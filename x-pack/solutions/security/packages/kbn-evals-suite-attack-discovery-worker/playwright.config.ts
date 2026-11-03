/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  repetitions: 1,
  // The runner's concurrency key is per space (`cancel-in-progress`, max 1), so a second
  // concurrent trigger in the eval space cancels the first. Rows run one at a time.
  workers: 1,
  // One row is generation, fingerprint matching and a review per attack, each an LLM pass.
  timeout: 60 * 60_000,
});
