/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; the GNU Affero General Public License v3.0 only; and the Server Side
 * Public License v 1".
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * Playwright config for the Osquery capability-trap eval.
 *
 * The trap seeds `osquery_manager installed, zero agents enrolled` on the shared
 * `evals_endpoint` stack. It must not run in the base `evals/` testDir: the
 * package install leaks into any concurrently-collected spec (e.g. the smoke
 * suite's "Osquery not installed" fallback golden) and its uninstall is
 * best-effort, so a failure leaves the base suite's premise broken.
 *
 * Run with:
 *   node scripts/evals start --suite endpoint-osquery-trap
 */
export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals_trap'),
  timeout: 30 * 60_000,
});
