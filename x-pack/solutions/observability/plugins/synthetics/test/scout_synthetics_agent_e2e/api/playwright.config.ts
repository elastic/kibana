/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

/**
 * Real Elastic Agent monitor-types suite (`elastic-agent-complete`). Sharding /
 * failover lives in `parallel.playwright.config.ts` so the two jobs do not share
 * Fleet Server :8220. Boot Kibana with:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet synthetics_agent_e2e
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
