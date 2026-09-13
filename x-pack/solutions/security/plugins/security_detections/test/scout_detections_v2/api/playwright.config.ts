/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 API Scout suite.
 *
 * Runs against the `alerting_v2_detections` server config set, which extends
 * the `alerting_v2` set with `--xpack.securityDetections.enableDetectionsOnV2=true`.
 * Both `xpack.alerting_v2.enabled` and `alerting:v2:enabled` (uiSettings) are on.
 *
 * Off-state coverage:
 *   - 503 (v2 alerting disabled): the off_states.spec tests flip the
 *     `alerting:v2:enabled` uiSettings at runtime and restore it after.
 *   - 404 (feature flag disabled): covered implicitly — with the flag off,
 *     no routes are registered and Kibana returns 404 for every path.  The
 *     unit tests in step 8.1 assert route registration is gated by the flag;
 *     this suite covers the flag-on behavior.
 *
 * Start server:
 *   node scripts/scout.js start-server --arch stateful --domain classic \
 *     --serverConfigSet alerting_v2_detections
 *
 * Run suite:
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --config x-pack/solutions/security/plugins/security_detections/test/scout_detections_v2/api/playwright.config.ts
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

export default createPlaywrightConfig({
  testDir: './tests',
});
