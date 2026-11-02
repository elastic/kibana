/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * Playwright config for Entity Analytics V2 evals.
 *
 * Requires the evals_entity_analytics_v2 Scout configSet, which enables the
 * entityAnalyticsEntityStoreV2 experimental flag and the Entity Store V2 UI setting.
 *
 * Run with:
 *   node scripts/evals start --suite entity-analytics-v2
 */
export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals/v2`,
  repetitions: 1,
  timeout: 30 * 60_000, // 30 minutes
});
