/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../../fixtures';
import { RULE_NAMES } from '../../../fixtures/generators';
import { SHORTER_TIMEOUT } from '../../../fixtures/constants';

test.describe('Rules Page - Rules Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesPage.goto();
  });

  test('should see the Rules Table container', async ({ pageObjects }) => {
    await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
  });

  test('should see an editable rule in the Rules Table', async ({ pageObjects }) => {
    await expect(pageObjects.rulesPage.ruleSearchField).toBeVisible();
    const editableRules = pageObjects.rulesPage.getEditableRules();
    await expect(editableRules.filter({ hasText: RULE_NAMES.FIRST_RULE_TEST })).toHaveCount(1);
  });

  test('should show the edit action button for an editable rule & open the edit rule flyout', async ({
    pageObjects,
  }) => {
    const editableRules = pageObjects.rulesPage.getEditableRules();
    const ruleRow = editableRules.filter({ hasText: RULE_NAMES.FIRST_RULE_TEST });

    // Verify the rule row exists & that the edit button visible on hover
    await expect(ruleRow).toBeVisible();
    await ruleRow.hover();

    // Verify the rule edit action (ruleSidebarEditAction) is visible
    const editActionContainer = pageObjects.rulesPage.getRuleSidebarEditAction(ruleRow);
    await expect(editActionContainer).toBeVisible({ timeout: SHORTER_TIMEOUT });

    // Verify the edit button is also visible
    const editButton = pageObjects.rulesPage.getEditActionButton(ruleRow);
    await expect(editButton).toBeVisible();

    // Verify the edit button is clickable and opens the edit rule flyout
    await editButton.click();
    await pageObjects.rulesPage.expectEditRuleFlyoutVisible();

    // Verify the edit rule flyout is visible with expected elements
    await expect(pageObjects.rulesPage.editRuleFlyout).toBeVisible();
    await expect(pageObjects.rulesPage.editRuleFlyoutCancelButton).toBeVisible();
    await expect(pageObjects.rulesPage.editRuleFlyoutSaveButton).toBeVisible();

    // Close the edit rule flyout & verify the edit rule flyout is closed
    await pageObjects.rulesPage.closeEditRuleFlyout();
    await expect(pageObjects.rulesPage.editRuleFlyout).toBeHidden({ timeout: SHORTER_TIMEOUT });
  });

  test('changes the rule status to "disabled"', async ({ pageObjects }) => {
    await expect(pageObjects.rulesPage.rulesTable).toBeVisible();

    await pageObjects.rulesPage.clickRuleStatusDropDownMenu(RULE_NAMES.FIRST_RULE_TEST);
    await pageObjects.rulesPage.clickDisableFromDropDownMenu();

    await expect(pageObjects.rulesPage.confirmModalButton).toBeVisible();
    await pageObjects.rulesPage.confirmModalButton.click();

    // Wait for the rule status to change
    await pageObjects.rulesPage.expectRuleToBeDisabled(RULE_NAMES.FIRST_RULE_TEST);
  });
});
