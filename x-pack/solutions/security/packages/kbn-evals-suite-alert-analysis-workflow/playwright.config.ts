/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The batch specs are their own suite (batch.playwright.config.ts): they are long, so they run on request.
  testIgnore: ['**/alert_analysis_batch.spec.ts', '**/alert_analysis_batch_integrity.spec.ts'],
  timeout: 30 * 60_000,
});
