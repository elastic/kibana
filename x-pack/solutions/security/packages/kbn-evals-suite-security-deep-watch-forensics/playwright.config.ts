/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Deep Watch forensic reconstruction can require multiple
  // generate_esql + execute_esql round trips per scenario.
  // 20 min leaves headroom for slow/larger models.
  timeout: 20 * 60_000,
});

// Forensic reconstruction occasionally hits transient LLM/rate-limit
// errors on multi-step tool chains. Two retries match sibling suites.
config.retries = 2;

export default config;
