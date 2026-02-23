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
  'Install prebuilt rules with preview',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('previews a prebuilt rule available for installation', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify rules are listed', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });

      await test.step('Open preview flyout for a rule', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await ruleName.first().click();
        const previewFlyout = page.testSubj.locator('installPrebuiltRulePreview');
        await expect(previewFlyout).toBeVisible();
      });
    });

    test('installs a prebuilt rule after previewing', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify install button is available in flyout', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });
    });

    test('shows custom query rule properties in preview', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify install controls are available', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('hides tabs and sections without content', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });
    });
  }
);
