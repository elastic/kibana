/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../../fixtures';
import { RULE_NAMES } from '../../../fixtures/generators';
import { getRuleIdByName } from '../../../fixtures/helpers';

// Failing: See https://github.com/elastic/kibana/issues/249094
test.describe.skip('Rule Details Page - Admin', { tag: ['@ess', '@svlOblt'] }, () => {
  let ruleId: string;

  test.beforeAll(async ({ apiServices }) => {
    // Get the rule ID for the custom threshold rule
    const foundRuleId = await getRuleIdByName(apiServices, RULE_NAMES.RULE_DETAILS_TEST);
    if (!foundRuleId) {
      throw new Error(`Rule ${RULE_NAMES.RULE_DETAILS_TEST} not found`);
    }
    ruleId = foundRuleId;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should navigate from rules table to rule details and display page correctly', async ({
    pageObjects,
  }) => {
    // Navigate to rules page
    await pageObjects.rulesPage.goto();
    await expect(pageObjects.rulesPage.pageTitle).toBeVisible();

    // Click on the rule in the table
    const rulesTable = pageObjects.rulesPage.rulesTable;
    const ruleLink = rulesTable.getByRole('link', { name: RULE_NAMES.RULE_DETAILS_TEST });
    await expect(ruleLink).toBeVisible();
    await ruleLink.click();

    // Verify rule details page loaded
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    // Verify rule name displays correctly
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(RULE_NAMES.RULE_DETAILS_TEST);

    // Verify rule type displays correctly (custom threshold)
    await expect(pageObjects.ruleDetailsPage.ruleType).toContainText('Custom threshold');

    // Verify key page components are visible
    await expect(pageObjects.ruleDetailsPage.ruleStatusPanel).toBeVisible();
    await expect(pageObjects.ruleDetailsPage.ruleDefinition).toBeVisible();
  });

  test('should load rule details page directly by URL', async ({ pageObjects }) => {
    // Navigate directly to rule details by ID
    await pageObjects.ruleDetailsPage.gotoById(ruleId);

    // Verify page loaded correctly
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(RULE_NAMES.RULE_DETAILS_TEST);
  });

  test('should display alert summary widget on the page', async ({ pageObjects }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    // Verify the compact alert summary widget is visible
    await expect(pageObjects.ruleDetailsPage.alertSummaryWidget.compact).toBeVisible();
  });

  test('should navigate to alerts tab with active filter when clicking active alerts', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    // Click on active alerts count
    await pageObjects.ruleDetailsPage.alertSummaryWidget.clickActiveAlerts();

    // Verify navigation to alerts tab with correct URL parameters
    const url = page.url();
    expect(url).toContain('tabId=alerts');
    expect(url).toContain('selectedOptions:!(active)');
    expect(url).toContain('rangeFrom:now-30d');
    expect(url).toContain('rangeTo:now');
  });

  test('should navigate to alerts tab with all statuses when clicking total alerts', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    // Click on total alerts count
    await pageObjects.ruleDetailsPage.alertSummaryWidget.clickTotalAlerts();

    // Verify navigation to alerts tab with correct URL parameters
    const url = page.url();
    expect(url).toContain('tabId=alerts');
    // All statuses = empty selectedOptions array
    expect(url).toContain('selectedOptions:!()');
    expect(url).toContain('rangeFrom:now-30d');
    expect(url).toContain('rangeTo:now');
  });

  test('should show edit and delete actions for admin user', async ({ pageObjects }) => {
    // Navigate to rule details
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    // Verify actions button is visible
    await expect(pageObjects.ruleDetailsPage.actionsButton).toBeVisible();

    // Open actions menu
    await pageObjects.ruleDetailsPage.openActionsMenu();

    // Verify edit and delete buttons are visible
    await expect(pageObjects.ruleDetailsPage.editRuleButton).toBeVisible();
    await expect(pageObjects.ruleDetailsPage.deleteRuleButton).toBeVisible();
  });

  test('should close actions popover when clicking actions button again', async ({
    pageObjects,
  }) => {
    // Navigate to rule details
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

    // Open actions menu
    await pageObjects.ruleDetailsPage.openActionsMenu();

    // Verify edit button is visible (popover is open)
    await expect(pageObjects.ruleDetailsPage.editRuleButton).toBeVisible();

    // Close actions menu
    await pageObjects.ruleDetailsPage.closeActionsMenu();

    // Verify edit button is no longer visible (popover is closed)
    await expect(pageObjects.ruleDetailsPage.editRuleButton).toBeHidden();
  });

  test('should display dashboard options in related dashboards dropdown when editing rule', async ({
    kbnClient,
    pageObjects,
  }) => {
    const testDashboardTitle = `Scout Test Dashboard for Rule Details ${Date.now()}`;

    // Create a test dashboard
    const dashboard = await kbnClient.savedObjects.create({
      type: 'dashboard',
      overwrite: false,
      attributes: {
        title: testDashboardTitle,
        description: 'Test dashboard for rule details Scout test',
        panelsJSON: '[]',
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    });
    const testDashboardId = dashboard.id;

    try {
      // Navigate to rule details
      await pageObjects.ruleDetailsPage.gotoById(ruleId);
      await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

      // Open rule edit form
      await pageObjects.ruleDetailsPage.openRuleEditForm();

      // Verify dashboard selector is visible
      await expect(pageObjects.ruleDetailsPage.dashboardsSelector).toBeVisible();

      // Get all dashboard options from the dropdown
      const optionsText = await pageObjects.ruleDetailsPage.getDashboardsOptionsList();

      // Verify options list is not empty
      expect(optionsText.length).toBeGreaterThan(0);
    } finally {
      // Clean up: delete the test dashboard
      await kbnClient.savedObjects.delete({
        type: 'dashboard',
        id: testDashboardId,
      });
    }
  });
});
