/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // The co-located Attack Discovery spec runs under its own config
  // (attack_discovery.playwright.config.ts) with the evals_tracing server config.
  testIgnore: '**/attack_discovery.spec.ts',
  timeout: 30 * 60_000,
});
