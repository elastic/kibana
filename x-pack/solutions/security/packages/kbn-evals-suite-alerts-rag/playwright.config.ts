/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Each test does one agent_builder/converse round-trip (LLM call over the
  // restored alerts snapshot, ~285 documents) plus N evaluator (LLM-as-judge)
  // calls. 120s was tight enough that the converse call alone exhausted the
  // budget for the larger model variants. 10 minutes leaves headroom for
  // slow models and judge passes without masking real regressions.
  timeout: 10 * 60_000,
});

config.retries = 2;

export default config;
