/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Each test batches all examples for one category through
  // /api/agent_builder/converse over the restored alerts snapshot
  // (~285 documents), plus N evaluator (LLM-as-judge) calls. 10 minutes was
  // tight for slow-thinking models — Gemini 3.1 Pro deterministically blew
  // through the 600s budget on `single_alert_query` across 3 attempts in
  // Buildkite build 441723 while the other 5 EIS core models finished
  // comfortably. 30 minutes matches every other security-evals suite
  // (pci-compliance, security-ai-rules, attack-discovery, …) and aligns
  // with the security-ai-rules note: "Gemini 2.5 Pro needs more time for
  // the full dataset". It does not mask regressions — pass/fail comes from
  // evaluator scores against snapshot invariants, not from wall-clock.
  timeout: 30 * 60_000,
});

config.retries = 2;

export default config;
