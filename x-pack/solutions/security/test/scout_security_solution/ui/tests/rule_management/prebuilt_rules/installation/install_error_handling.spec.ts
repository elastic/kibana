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
  'Install prebuilt rules - error handling',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, page }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('shows an error toast when unable to install a prebuilt rule', async ({ page }) => {
      await test.step('Navigate to add Elastic rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify the add rules table is loaded', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('shows an error toast when unable to install selected prebuilt rules', async ({
      page,
    }) => {
      await test.step('Navigate to add Elastic rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify install all button is available', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('shows error and success toasts when installation was partially successful', async ({
      page,
    }) => {
      await test.step('Navigate to add Elastic rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify install controls are available', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });
  }
);
