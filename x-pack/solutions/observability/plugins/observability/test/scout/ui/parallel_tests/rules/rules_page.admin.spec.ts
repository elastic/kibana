/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import type { CreateRuleResponse } from './types';
import { createRule } from './helpers';

test.describe('Rules Page - Header', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Navigate to the rules list page
    await pageObjects.rulesPage.goto();
    // Verify we're on the rules page
    await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
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

test.describe('Rules Page - Rules Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  let createdRule: CreateRuleResponse['data'];
  test.beforeAll(async ({ apiServices }) => {
    createdRule = (await createRule(apiServices, { name: 'Admin Test Rule' })).data;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesPage.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.rules.delete(createdRule.id);
  });

  test('should see the Rules Table container', async ({ pageObjects }) => {
    await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
  });

  test('should see an editable rule in the Rules Table', async ({ pageObjects }) => {
    const editableRules = pageObjects.rulesPage.getEditableRules();
    await expect(editableRules.filter({ hasText: createdRule.name })).toHaveCount(1);
  });

  test('should show the edit action button for an editable rule', async ({ pageObjects }) => {
    const editableRules = pageObjects.rulesPage.getEditableRules();
    const ruleRow = editableRules.filter({ hasText: createdRule.name });

    // Verify the rule row exists & that the edit button visible on hover
    await expect(ruleRow).toBeVisible();
    await ruleRow.hover();

    // Verify the rule edit action (ruleSidebarEditAction) is visible
    const editActionContainer = pageObjects.rulesPage.getRuleSidebarEditAction(ruleRow);
    await expect(editActionContainer).toBeVisible({ timeout: 5000 });

    // Verify the edit button is also visible
    const editButton = pageObjects.rulesPage.getEditActionButton(ruleRow);
    await expect(editButton).toBeVisible();
  });
});
