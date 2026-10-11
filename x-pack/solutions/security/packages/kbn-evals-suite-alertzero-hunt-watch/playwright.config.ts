/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // 3 phases x 14 reports x PER_HUNT_MS (60s per hunt, incl. Tier 2 model
  // calls) plus ingest/refresh/poll overhead; pinned by
  // src/harness/playwright_budget.test.ts.
  timeout: 60 * 60_000,
});
