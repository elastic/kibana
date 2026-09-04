/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * Playwright config for endpoint Osquery live-state evals.
 *
 * Requires the `evals_endpoint_osquery` Scout config set, which installs the
 * osquery_manager integration on top of the base endpoint stack. The base
 * `playwright.config.ts` deliberately runs WITHOUT Osquery so the
 * "integration not installed" degradation path stays observable.
 *
 * Run with:
 *   node scripts/evals start --suite endpoint-osquery
 */
export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals_osquery`,
  timeout: 30 * 60_000,
});
