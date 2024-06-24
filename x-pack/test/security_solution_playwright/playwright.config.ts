/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.ftr/playwright.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testMatch: '**/*.@(spec|test).?(c|m)[jt]s?(x)',
  testDir: './tests',
  outputDir:
    process.env.OUTPUT_DIR ||
    path.resolve(__dirname, '../../../target/kibana-security-solution/playwright/test-results'),
  workers: 1,
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  // workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    [
      'junit',
      {
        outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_FILE,
      },
    ],
    [
      'json',
      {
        outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
      },
    ],
    [
      './custom_json_playwright_reporter',
      { outputFile: process.env.PLAYWRIGHT_SUMMARY_JSON_OUTPUT_FILE },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.KIBANA_URL || 'http://localhost:5620',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    testIdAttribute: 'data-test-subj',

    bypassCSP: true,

    extraHTTPHeaders: {
      'kbn-xsrf': 'playwright',
    },

    headless: !!process.env.CI ?? 'false',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './playwright/.auth/elastic.json',
      },
      dependencies: ['setup'],
    },
  ],
});
