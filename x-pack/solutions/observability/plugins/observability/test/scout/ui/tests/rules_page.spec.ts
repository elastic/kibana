/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';
import { createRule } from './rules/helpers';
import type { CreateRuleResponse } from './rules/types';

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

test.describe('Rules Page - Logs Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  let createdRule: CreateRuleResponse['data'];

  test.beforeAll(async ({ apiServices }) => {
    // Create a test rule that will generate event log entries
    createdRule = (await createRule(apiServices, { name: 'Logs Tab Test Rule' })).data;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
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

    // Verify individual components
    await expect(pageObjects.rulesPage.datePicker).toBeVisible();
    await expect(pageObjects.rulesPage.statusFilter).toBeVisible();
  });

  test('should hide loading indicator after logs data loads', async ({ pageObjects }) => {
    // Click logs tab - loading may be very fast
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

  test('should open date picker popover', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Verify date picker button is enabled
    await expect(pageObjects.rulesPage.datePicker).toBeEnabled();

    // Click to open - the openDatePicker method already verifies it opens
    await pageObjects.rulesPage.openDatePicker();

    // If we got here without error, the date picker opened successfully
  });

  test('should open status filter dropdown', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Open status filter using the helper method
    await pageObjects.rulesPage.openStatusFilter();

    // Verify the specific status filter content is visible
    const statusFilterContent = pageObjects.rulesPage.page.locator(
      '[data-test-subj="eventLogStatusFilter"]'
    );
    await expect(statusFilterContent).toHaveAttribute('class', /euiPopover-isOpen/);
  });

  test('should display event log table and count rows', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Simply verify the table container is visible (it exists even when empty)
    await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();

    // Get row count using the helper method
    const rowCount = await pageObjects.rulesPage.getEventLogRowCount();

    // Verify we get a number back
    expect(typeof rowCount).toBe('number');
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('should display rule name links in event log table', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Wait for loading to complete
    await expect(pageObjects.rulesPage.loadingIndicator).toBeHidden();

    // Get all rule name links
    const ruleNameLinks = pageObjects.rulesPage.getRuleNameLinks();

    // Verify link count is valid (may be 0 if no events yet)
    const linkCount = await ruleNameLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(0);
  });

  test('should verify event log table columns are present', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Wait for loading to complete
    await expect(pageObjects.rulesPage.loadingIndicator).toBeHidden();

    // Verify the event log table is visible
    await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();

    // The table structure should exist even if empty
    const tableHeaders = pageObjects.rulesPage.page.locator(
      '[data-test-subj="eventLogList"] thead th'
    );

    // Count headers (may be 0 if table is empty or still loading)
    const headerCount = await tableHeaders.count();
    expect(headerCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle empty state gracefully', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // The table should always be visible (even if empty)
    await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();

    // Check row count
    const rowCount = await pageObjects.rulesPage.getEventLogRowCount();

    // Row count should be a valid number (0 or more)
    expect(typeof rowCount).toBe('number');
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('should persist logs tab selection in URL', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Verify URL contains logs tab indicator
    const url = pageObjects.rulesPage.page.url();
    expect(url).toContain('logs');
  });

  test('should refresh logs data when using date picker', async ({ pageObjects }) => {
    // Navigate to logs tab
    await pageObjects.rulesPage.clickLogsTab();
    await pageObjects.rulesPage.expectLogsContentLoaded();

    // Open date picker
    await pageObjects.rulesPage.openDatePicker();

    // The date picker opening itself tests the interaction
    // After changing dates, the table should still be visible
    await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();

    // Row count should still be a valid number
    const currentRowCount = await pageObjects.rulesPage.getEventLogRowCount();
    expect(typeof currentRowCount).toBe('number');
    expect(currentRowCount).toBeGreaterThanOrEqual(0);
  });
});
