/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { testTimeoutMs } from './src/budget';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Sized from FP_TP_COHORT / FP_TP_MAX_EXAMPLES_PER_CORPUS / EVAL_REPETITIONS /
  // EVAL_CONCURRENCY so the full scored cohort fits; never below the original 120 min.
  timeout: testTimeoutMs(process.env),
});
