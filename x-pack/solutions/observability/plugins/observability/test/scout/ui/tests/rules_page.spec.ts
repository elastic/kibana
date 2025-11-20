/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe('Rules Page', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Navigate to the rules list page
    await pageObjects.rulesPage.goto();
    // Verify we're on the rules page
    await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
  });

  test('should open settings flyout, verify buttons state, and close successfully', async ({
    pageObjects,
  }) => {
    // Open the settings flyout
    await pageObjects.rulesPage.openSettingsFlyout();
    await pageObjects.rulesPage.expectSettingsFlyoutVisible();

    // Verify buttons are visible and enabled
    await expect(pageObjects.rulesPage.settingsFlyoutCancelButton).toBeVisible();
    await expect(pageObjects.rulesPage.settingsFlyoutCancelButton).toBeEnabled();
    await expect(pageObjects.rulesPage.settingsFlyoutSaveButton).toBeVisible();
    await expect(pageObjects.rulesPage.settingsFlyoutSaveButton).toBeDisabled();

    // Close the flyout
    await pageObjects.rulesPage.closeSettingsFlyout();

    // Verify the flyout is closed
    await expect(pageObjects.rulesPage.settingsFlyout).toBeHidden();
  });

  test('should filter rule types using search, verify counts, and close modal', async ({
    pageObjects,
  }) => {
    // Open the rule type modal
    await pageObjects.rulesPage.openRuleTypeModal();

    await pageObjects.rulesPage.expectAllRuleTypesCount(14);

    // Type in the search input
    const searchInput = pageObjects.rulesPage.ruleTypeModalSearch;
    await searchInput.fill('log');

    await pageObjects.rulesPage.expectAllRuleTypesCount(1);

    // Verify the search input contains the text
    await expect(searchInput).toHaveValue('log');

    // Clear the search
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');

    await pageObjects.rulesPage.expectAllRuleTypesCount(1);

    // Close the modal
    await pageObjects.rulesPage.closeRuleTypeModal();

    // Verify the modal is closed
    await expect(pageObjects.rulesPage.ruleTypeModal).toBeHidden();
  });
});
