/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import { API_BASE_PATH } from '@kbn/license-management-plugin/common/constants';

spaceTest.describe('Alert user assignment - Basic License', { tag: ['@ess'] }, () => {
  let ruleName: string;

  spaceTest.beforeEach(async ({ browserAuth, apiServices, page, config, scoutSpace }) => {
    // Login as admin
    await browserAuth.loginAsAdmin();

    // Downgrade license to basic
    const response = await page.request.post(
      `${config.hosts.kibana}${API_BASE_PATH}/start_basic?acknowledge=true`,
      {
        headers: {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'security-solution',
        },
      }
    );

    if (!response.ok()) {
      throw new Error(
        `Failed to start basic license: ${response.status()} ${response.statusText()}`
      );
    }

    // Clean up existing data
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionRule.deleteAllAlerts();

    // Set up rule name
    ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;

    // Generate test data FIRST before creating the rule
    await apiServices.detectionRule.indexTestDocument('logs-test', {
      'event.category': 'security',
      'event.type': 'alert',
      message: 'Test security event for detection rule',
      'host.name': 'test-host',
      'user.name': 'test-user',
    });

    // Create the rule with a more recent 'from' time to catch new data
    const ruleWithRecentFromTime = {
      ...CUSTOM_QUERY_RULE,
      name: ruleName,
      from: 'now-1m', // Look for data from the last minute
      rule_id: `test_rule_${scoutSpace.id}_${Date.now()}`,
    };
    const createdRule = await apiServices.detectionRule.createCustomQueryRule(
      ruleWithRecentFromTime
    );

    // Wait for rule execution
    await apiServices.detectionRule.waitForRuleExecution(createdRule.rule_id);
  });

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionRule.deleteAllAlerts();
    await apiServices.detectionRule.cleanupTestData('logs-*');
  });

  spaceTest(
    'user with Basic license should not be able to update assignees',
    async ({ page, pageObjects }) => {
      // Navigate to alerts page
      await pageObjects.alertsTablePage.navigateAndDismissOnboarding();

      // Wait for alerts to populate
      await pageObjects.alertsTablePage.waitForAlertsToLoad();
      await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper(ruleName);

      // Check alerts table - open context menu for first alert
      const timelineContextMenuButton = page.testSubj.locator('timeline-context-menu-button');
      // eslint-disable-next-line playwright/no-nth-methods
      await timelineContextMenuButton.first().click();

      // Verify assign/unassign menu items don't exist
      const assignMenuItem = page.testSubj.locator('alert-assignees-context-menu-item');
      const unassignMenuItem = page.testSubj.locator('remove-alert-assignees-menu-item');
      await expect(assignMenuItem).toBeHidden();
      await expect(unassignMenuItem).toBeHidden();

      // Close context menu by clicking elsewhere
      await page.keyboard.press('Escape');

      // Check alert's details flyout
      await pageObjects.alertsTablePage.expandFirstAlert();

      // Verify assign button is disabled
      const assignButton = page.testSubj.locator('securitySolutionFlyoutHeaderAssigneesAddButton');
      await expect(assignButton).toBeDisabled();
    }
  );
});
