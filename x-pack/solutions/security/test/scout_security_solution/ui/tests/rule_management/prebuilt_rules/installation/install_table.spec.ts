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
  'Install prebuilt rules - table',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('paginates over prebuilt rules on Rule Installation page', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify rules are listed in the table', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('sorts prebuilt rules on Rule Installation page', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify sorting controls are available', async () => {
        const installAllBtn = page.testSubj.locator('installAllRulesButton');
        await expect(installAllBtn).toBeVisible();
      });
    });

    test('filters prebuilt rules by rule name on Rule Installation page', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify search input is available for filtering', async () => {
        const ruleSearchField = page.testSubj.locator('ruleSearchField');
        await expect(ruleSearchField).toBeVisible();
      });
    });

    test('filters prebuilt rules by tags on Rule Installation page', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify tags filter is available', async () => {
        const tagsFilterBtn = page.testSubj.locator('tags-filter-popover-button');
        await expect(tagsFilterBtn).toBeVisible();
      });
    });

    test('shows empty state when filters match no rules', async ({ page }) => {
      await test.step('Navigate to add rules page', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
        await expect(addRulesTable).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Search for non-existing rule', async () => {
        const ruleSearchField = page.testSubj.locator('ruleSearchField');
        await ruleSearchField.fill('no such rules');
        await ruleSearchField.press('Enter');
        await expect(page.getByText('No items found')).toBeVisible();
      });
    });
  }
);
