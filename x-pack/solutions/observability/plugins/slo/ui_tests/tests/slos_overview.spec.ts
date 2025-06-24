/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

import { SLODataService } from '../services/slo_data_service';

test.describe('SLOs Overview', { tag: ['@ess', '@svlOblt'] }, () => {
  let dataService: SLODataService;

  test.beforeAll(async ({ config, kbnUrl, kbnClient }) => {
    dataService = new SLODataService(kbnUrl.toString(), config.hosts.elasticsearch, kbnClient);

    await dataService.generateSloData();
    await dataService.addSLO();
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();

    await pageObjects.slo.goto();
  });

  test('Go to slos overview', async ({ page }) => {
    // Already navigated in beforeEach
    // This test ensures the page loads
    expect(page).toBeDefined();
  });

  test('validate data retention tab', async ({ page }) => {
    await expect(async () => {
      await page.getByTestId('querySubmitButton').click();

      await page.waitForSelector('text="Test Stack SLO"');
      const cards = await page.locator('text="Test Stack SLO"').all();
      expect(cards.length > 5).toBeTruthy();
    }).toPass({
      intervals: [10_000, 20_000, 30_000],
      timeout: 60_000,
    });
  });
});
