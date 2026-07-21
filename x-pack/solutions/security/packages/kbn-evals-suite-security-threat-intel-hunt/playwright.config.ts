/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Each example is a single `hunt_behavior` route call (one structured-output
  // LLM extraction), not an agent tool loop, so the suite is fast. 15 min for
  // the 8-example golden set leaves ample headroom for slow/larger models.
  timeout: 15 * 60_000,
});

// Structured-output extraction occasionally hits transient LLM/rate-limit
// errors. Two retries match the sibling security suites and keep the suite
// robust without masking real regressions.
config.retries = 2;

export default config;
