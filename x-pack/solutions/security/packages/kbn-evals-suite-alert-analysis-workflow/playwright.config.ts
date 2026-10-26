/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The batch spec is its own suite (batch.playwright.config.ts): it is long, so it runs on request.
  testIgnore: '**/alert_analysis_batch.spec.ts',
  timeout: 30 * 60_000,
});
