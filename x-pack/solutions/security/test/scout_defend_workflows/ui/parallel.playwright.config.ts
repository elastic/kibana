/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@kbn/scout-security';

const baseConfig = createPlaywrightConfig({
  testDir: './parallel_tests/',
  workers: 2,
  runGlobalSetup: false,
});

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/example.spec.ts', '**/rbac/navigation.spec.ts'],
});
