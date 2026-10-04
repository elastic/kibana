/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The full Floor->Dark->Deep->Detection(x2) escalation chain is a nested
  // workflow.execute fan-out with up to 5 live LLM calls per run; give it
  // real headroom, matching the timeout the manual verification runs needed
  // this session (observed 3-8 min end to end depending on model).
  timeout: 15 * 60_000,
});

// Same rationale as sibling suites (deep-watch-forensics): forensic/agentic
// multi-step chains occasionally hit transient LLM/rate-limit errors.
config.retries = 1;

export default config;
