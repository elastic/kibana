/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: Path.join(__dirname, './evals'),
  repetitions: 3, // Run each eval 3 times for statistical significance
  timeout: 60 * 60_000, // 60 minutes — Gemini 2.5 Pro needs more time for the full 8-example × 3-rep dataset
});
