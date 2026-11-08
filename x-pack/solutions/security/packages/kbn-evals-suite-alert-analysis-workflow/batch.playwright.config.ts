/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

/** The batch reliability eval only; `playwright.config.ts` runs the single-alert eval. */
export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  testIgnore: '**/alert_analysis_classification.spec.ts',
  timeout: 90 * 60_000,
});
