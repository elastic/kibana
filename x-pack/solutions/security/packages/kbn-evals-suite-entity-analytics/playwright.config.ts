/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  // The v2 suite (`playwright.v2.config.ts`) owns specs under `evals/v2/` and
  // requires the `evals_entity_analytics_v2` Scout configSet. Excluding them
  // here prevents the v1 run from picking them up via recursive testDir walk
  // and failing them under the wrong configSet.
  testIgnore: ['**/v2/**'],
  testDir: `${__dirname}/evals/v1`,
  repetitions: 1,
  timeout: 60 * 60_000,
});
