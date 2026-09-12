/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * Dedicated config for the co-located Attack Discovery (Chrysalis kill-chain) spec.
 * Isolated from the persona-matrix spec via testIgnore so it can run under the
 * evals_tracing server config (trace-based evaluators: Latency / Tool Calls /
 * tokens) while persona-matrix keeps evals_security_persona_matrix.
 */
export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  testIgnore: '**/persona_matrix.spec.ts',
  timeout: 30 * 60_000,
});
