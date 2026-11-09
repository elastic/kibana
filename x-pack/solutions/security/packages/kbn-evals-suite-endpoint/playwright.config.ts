/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * Base endpoint evals (Elastic Defend, no Osquery integration installed).
 *
 * Osquery live-state evals live in `playwright.osquery.config.ts` against the
 * `evals_endpoint_osquery` config set — keeping the integration out of this
 * stack is what makes the "Osquery not installed" branch observable here.
 */
export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  timeout: 30 * 60_000,
});
