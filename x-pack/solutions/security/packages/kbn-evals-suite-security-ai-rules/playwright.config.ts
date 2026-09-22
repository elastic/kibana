/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  repetitions: 1, // Reduced from 3 for faster iteration; increase for statistically significant benchmarking
  timeout: 30 * 60_000, // 30 minutes — Gemini 2.5 Pro needs more time for the full dataset
});
