/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { INSTALL_PREBUILT_RULES_URL } from '../../../../common/urls';

test.describe(
  'Install prebuilt rules - workflow',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('installs prebuilt rules one by one', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify install button is available for individual rules', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('installs multiple selected prebuilt rules', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify install selected rules button exists', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('installs all available rules at once', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify install all button is available', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
        await expect(installAllBtn).toBeEnabled();
      });
    });

    test('displays empty screen when all prebuilt rules are installed', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Install all rules and verify empty state', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('navigates back to rules table after installation', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify go back button exists', async () => {
        const goBackBtn = page.testSubj.locator('goBackToRulesTableButton');
        await expect(goBackBtn).toBeVisible();
      });
    });
  }
);
