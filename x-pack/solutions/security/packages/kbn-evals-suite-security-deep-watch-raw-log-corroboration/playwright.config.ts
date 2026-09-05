/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Raw-log corroboration pivots a multi-stage narrative into raw telemetry,
  // which is several generate_esql + execute_esql round trips per scenario.
  // Matches the sibling deep-watch-forensics suite's budget.
  timeout: 20 * 60_000,
});

// Transient LLM/rate-limit errors on multi-step tool chains; two retries
// matches sibling suites.
config.retries = 2;

export default config;
