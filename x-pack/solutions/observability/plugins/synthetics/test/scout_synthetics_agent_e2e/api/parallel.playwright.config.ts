/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

/**
 * Real Elastic Agent sharding/failover suite. Uses two lightweight
 * `elastic-agent` containers (not `-complete`) and HTTP monitors only.
 * `parallel.playwright.config.ts` is the Scout dual-config filename so this
 * job does not share Fleet Server :8220 with the complete-image monitor-types
 * suite; `workers: 1` keeps the run sequential.
 *
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet synthetics_agent_e2e
 *   node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/synthetics/test/scout_synthetics_agent_e2e/api/parallel.playwright.config.ts
 */
export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 1,
});
