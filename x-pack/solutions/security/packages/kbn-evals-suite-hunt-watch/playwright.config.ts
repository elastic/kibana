/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The Worker's per-space `concurrency: { strategy: drop, max: 1 }` means a second
  // concurrent trigger in the same space is silently dropped, not queued. Repetitions
  // > 1 would race two triggers in the default eval space against each other.
  repetitions: 1,
  // Examples are triggered sequentially (see `concurrency: 1` on every `evaluateDataset()`
  // call in evals/hunt_watch.spec.ts) for the same reason, so a second Playwright worker
  // buys nothing and risks interleaving the approval spec with the quality spec.
  workers: 1,
  timeout: 30 * 60_000,
});
