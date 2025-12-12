/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-security';

// Simple Playwright config - no globalSetup needed
// Auxiliary mock server is managed by Scout's config (cspm_agentless/stateful.config.ts)
export default createPlaywrightConfig({
  testDir: './parallel_tests/',
  workers: 2,
});
