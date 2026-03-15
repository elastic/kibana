/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe('Alert Table Controls', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, page, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should enter and exit full screen', async ({ page }) => {
    const fullScreenButton = page.testSubj.locator('dataGridFullScreenButton');
    await expect(fullScreenButton).toHaveAttribute('aria-label', 'Enter fullscreen');

    await fullScreenButton.click();
    await expect(fullScreenButton).toHaveAttribute('aria-label', 'Exit fullscreen');

    await fullScreenButton.click();
    await expect(fullScreenButton).toHaveAttribute('aria-label', 'Enter fullscreen');
  });

  test('should have correct column sorting values', async ({ page }) => {
    const columnOrderBtn = page.testSubj.locator('dataGridColumnSelectorButton');
    await expect(columnOrderBtn).toBeVisible();

    await test.step('Date column - Sort Old-New', async () => {
      const timestampHeader = page.testSubj.locator('dataGridHeaderCell-@timestamp');
      await timestampHeader.click({ button: 'right' });

      const headerActions = page.testSubj.locator('dataGridHeaderCellActionGroup-@timestamp');
      await expect(headerActions).toBeVisible();
      await expect(headerActions).toContainText('Sort Old-New');
      await page.keyboard.press('Escape');
    });

    await test.step('Number column - Sort Low-High', async () => {
      const riskScoreHeader = page.testSubj.locator('dataGridHeaderCell-kibana.alert.risk_score');
      await riskScoreHeader.click({ button: 'right' });

      const headerActions = page.testSubj.locator(
        'dataGridHeaderCellActionGroup-kibana.alert.risk_score'
      );
      await expect(headerActions).toBeVisible();
      await expect(headerActions).toContainText('Sort Low-High');
      await page.keyboard.press('Escape');
    });

    await test.step('Text column - Sort A-Z', async () => {
      const ruleHeader = page.testSubj.locator('dataGridHeaderCell-kibana.alert.rule.name');
      await ruleHeader.click({ button: 'right' });

      const headerActions = page.testSubj.locator(
        'dataGridHeaderCellActionGroup-kibana.alert.rule.name'
      );
      await expect(headerActions).toBeVisible();
      await expect(headerActions).toContainText('Sort A-Z');
      await page.keyboard.press('Escape');
    });
  });

  test('should retain column configuration after reloading the page', async ({ page }) => {
    const severityField = 'kibana.alert.severity';
    const idField = '_id';

    await expect(page.testSubj.locator(`dataGridHeaderCell-${severityField}`)).toBeVisible();

    await test.step('Open fields browser and modify columns', async () => {
      const fieldsBrowserBtn = page.testSubj.locator('show-field-browser');
      await fieldsBrowserBtn.click();
      await expect(page.testSubj.locator('fields-browser-container')).toBeVisible();

      const searchInput = page.testSubj.locator('field-search');
      await searchInput.fill(severityField);
      const severityCheckbox = page.testSubj.locator(`field-${severityField}-checkbox`);
      await severityCheckbox.uncheck();

      await searchInput.clear();
      await searchInput.fill(idField);
      const idCheckbox = page.testSubj.locator(`field-${idField}-checkbox`);
      await idCheckbox.check();

      await page.testSubj.locator('close').click();
    });

    await test.step('Reload and verify columns persist', async () => {
      await page.reload();
      await page.testSubj
        .locator('events-container-loading-false')
        .waitFor({ state: 'visible', timeout: 60_000 });

      await expect(page.testSubj.locator(`dataGridHeaderCell-${idField}`)).toBeVisible();
    });
  });

  test('should retain columns when switching between event rendered view and grid view', async ({
    page,
  }) => {
    const idField = '_id';

    await test.step('Add _id column via fields browser', async () => {
      const fieldsBrowserBtn = page.testSubj.locator('show-field-browser');
      await fieldsBrowserBtn.click();
      await expect(page.testSubj.locator('fields-browser-container')).toBeVisible();

      const searchInput = page.testSubj.locator('field-search');
      await searchInput.fill(idField);
      const idCheckbox = page.testSubj.locator(`field-${idField}-checkbox`);
      await idCheckbox.check();
      await page.testSubj.locator('close').click();
    });

    await expect(page.testSubj.locator(`dataGridHeaderCell-${idField}`)).toBeVisible();

    await test.step('Switch to event rendered view', async () => {
      await page.testSubj.locator('additionalFilters').click();
      await page.testSubj.locator('dataGridEventRenderedViewSwitch').click();
    });

    await test.step('Switch back to grid view and verify column', async () => {
      await page.testSubj.locator('additionalFilters').click();
      await page.testSubj.locator('dataGridGridViewSwitch').click();

      await expect(page.testSubj.locator(`dataGridHeaderCell-${idField}`)).toBeVisible();
    });
  });
});
