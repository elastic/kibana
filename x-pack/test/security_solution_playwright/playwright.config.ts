/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 60000,
  testDir: './tests/',
  testMatch: '**/*.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    baseURL: process.env.KIBANA_URL,
    bypassCSP: true,
    actionTimeout: 60000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'login_ess',
      testMatch: '**/setup/login_ess.ts',
    },
    {
      name: 'login_serverless',
      testMatch: '**/setup/login_serverless.ts',
    },
    {
      name: 'ess',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['login_ess'],
    },
    {
      name: 'serverless',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['login_serverless'],
    },
  ],
});
