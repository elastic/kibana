/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';
import { generateAlertsData } from '../fixtures/generators';

test.describe('Alert Details Page', { tag: ['@ess', '@svlOblt'] }, () => {
  const alertId = '4c87bd11-ff31-4a05-8a04-833e2da94858';
  test.beforeAll(async ({ esClient }) => {
    await generateAlertsData({
      esClient,
      alertId,
      ruleName: 'Test Rule Name',
    });
  });
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should show error when the alert does not exist', async ({ page, pageObjects }) => {
    await pageObjects.alertPage.goto('non-existent-alert-id');
    await expect(page.testSubj.locator('alertDetailsError')).toBeVisible();
  });

  test('should show tabbed view', async ({ page, pageObjects }) => {
    await pageObjects.alertPage.goto(alertId);
    await expect(page.testSubj.locator('overviewTab')).toBeVisible();
    await expect(page.testSubj.locator('metadataTab')).toBeVisible();
  });
});
