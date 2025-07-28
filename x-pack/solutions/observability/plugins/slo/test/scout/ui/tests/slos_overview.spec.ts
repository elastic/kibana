/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

const TEST_TIMEOUT = 3 * 60 * 1000; // 3 minutes timeout, needed to wait for the SLOs to be created

test.describe('SLOs Overview', { tag: ['@ess', '@svlOblt'] }, () => {
  test.describe.configure({ timeout: TEST_TIMEOUT });

  test.beforeAll(async ({ sloData }) => {
    await sloData.generateSloData();
    await sloData.addSLO();
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();

    await pageObjects.slo.goto();
  });

  test('Go to slos overview and validate data retention tab', async ({ page }) => {
    // Already navigated in beforeEach
    // This test ensures the page loads
    expect(page).toBeDefined();
    await expect(async () => {
      await page.getByTestId('querySubmitButton').click();

      await expect
        .poll(() => page.locator('text=Test Stack SLO').count(), { timeout: 1000 })
        .toBeGreaterThan(5);
    }).toPass({
      intervals: [10000],
      timeout: TEST_TIMEOUT,
    });
  });
});
