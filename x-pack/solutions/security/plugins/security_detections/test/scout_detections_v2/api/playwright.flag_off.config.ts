/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 API Scout suite — feature-flag-off path.
 *
 * Runs against the `detections_v2_flag_off` server config set.  That set starts
 * Kibana with alerting v2 live but without
 * `--xpack.securityDetections.enableDetectionsOnV2=true`, so no Detection v2
 * routes are registered.  Every request to a Detection v2 path should 404.
 *
 * This suite is separate from playwright.config.ts because it needs a different
 * server boot.  Run it after starting the flag-off server:
 *
 * Start server:
 *   node scripts/scout.js start-server --arch stateful --domain classic \
 *     --serverConfigSet detections_v2_flag_off
 *
 * Run suite:
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --config x-pack/solutions/security/plugins/security_detections/test/scout_detections_v2/api/playwright.flag_off.config.ts
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

// eslint-disable-next-line import/no-default-export
export default createPlaywrightConfig({
  testDir: './tests/flag_off',
});
