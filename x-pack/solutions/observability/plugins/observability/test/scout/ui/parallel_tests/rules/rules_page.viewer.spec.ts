/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import { createRule } from './helpers';
import type { CreateRuleResponse } from './types';

test.describe('Rules Page - Header', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
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
});

test.describe('Rules Page - Logs Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  let createdRule: CreateRuleResponse['data'];

  test.beforeAll(async ({ apiServices }) => {
    // Create a test rule that will generate event log entries
    createdRule = (await createRule(apiServices, { name: 'Logs Tab Test Rule' })).data;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    // Navigate to the rules list page
    await pageObjects.rulesPage.goto();
    // Verify we're on the rules page
    await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
  });

  test.afterAll(async ({ apiServices }) => {
    // Clean up the created rule
    if (createdRule?.id) {
      await apiServices.alerting.rules.delete(createdRule.id);
    }
  });

  test('should navigate to logs tab and display event log table', async ({ pageObjects }) => {
    // Click the logs tab
    await pageObjects.rulesPage.clickLogsTab();

    // Verify the event log table is visible
    await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();

    // Verify the tab is marked as active
    await pageObjects.rulesPage.expectLogsTabActive();
  });

  test('should load logs tab content when navigating directly via URL', async ({ pageObjects }) => {
    // Navigate directly to logs tab via URL
    await pageObjects.rulesPage.gotoLogsTab();

    // Verify the event log table loads correctly
    await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();
  });

  test('should display all expected sections on logs tab', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();

    // Verify all main sections are visible
    await pageObjects.rulesPage.expectLogsTabSectionsVisible();

    // Additional verification that individual components are visible
    await expect(pageObjects.rulesPage.datePicker).toBeVisible();
    await expect(pageObjects.rulesPage.statusFilter).toBeVisible();
  });

  test('should hide loading indicator after logs data loads', async ({ pageObjects }) => {
    // Click logs tab
    await pageObjects.rulesPage.clickLogsTab();

    // Wait for loading to complete and table to be visible
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Verify loading indicator is hidden after load
    await expect(pageObjects.rulesPage.loadingIndicator).toBeHidden();
  });

  test('should have functional date picker on logs tab', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Verify date picker is present and interactive
    await expect(pageObjects.rulesPage.datePicker).toBeVisible();
    await expect(pageObjects.rulesPage.datePicker).toBeEnabled();
  });

  test('should have functional status filter button on logs tab', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Verify status filter is present and interactive
    await expect(pageObjects.rulesPage.statusFilter).toBeVisible();
    await expect(pageObjects.rulesPage.statusFilter).toBeEnabled();
  });

  test('should persist logs tab selection in URL', async ({ page, pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Verify URL contains logs tab indicator
    const url = page.url();
    expect(url).toContain('logs');
  });
});

test.describe('Rules Page - Rules Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  let createdRule: CreateRuleResponse['data'];
  test.beforeAll(async ({ apiServices }) => {
    createdRule = (await createRule(apiServices)).data;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.rulesPage.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.rules.delete(createdRule.id);
  });

  test('should see the Rules Table container', async ({ pageObjects }) => {
    await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
  });

  test('should see a non-editable rule in the Rules Table', async ({ pageObjects }) => {
    const nonEditableRules = pageObjects.rulesPage.getNonEditableRules();
    await expect(nonEditableRules.filter({ hasText: createdRule.name })).toHaveCount(1);
  });
});
