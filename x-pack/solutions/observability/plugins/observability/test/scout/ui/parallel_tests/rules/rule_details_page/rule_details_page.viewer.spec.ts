/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';
import { RULE_NAMES } from '../../../fixtures/generators';
import { getRuleIdByName } from '../../../fixtures/helpers';

test.describe(
  'Rule Details Page - Viewer',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let ruleId: string;

    test.beforeAll(async ({ apiServices }) => {
      // Get the rule ID for the rule created in global setup
      const foundRuleId = await getRuleIdByName(apiServices, RULE_NAMES.RULE_DETAILS_TEST);
      if (!foundRuleId) {
        throw new Error(`Rule ${RULE_NAMES.RULE_DETAILS_TEST} not found`);
      }
      ruleId = foundRuleId;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('should navigate to rule details page and display page correctly', async ({
      pageObjects,
    }) => {
      // Navigate directly to rule details by ID
      await pageObjects.ruleDetailsPage.gotoById(ruleId);

      // Verify rule details page loaded
      await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

      // Verify rule name displays correctly
      await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(RULE_NAMES.RULE_DETAILS_TEST);

      // Verify rule type displays correctly
      await expect(pageObjects.ruleDetailsPage.ruleType).toContainText('Custom threshold');

      // Verify key page components are visible
      await expect(pageObjects.ruleDetailsPage.ruleStatusPanel).toBeVisible();
      await expect(pageObjects.ruleDetailsPage.ruleDefinition).toBeVisible();
    });

    test('should display alert summary widget on the page', async ({ pageObjects }) => {
      await pageObjects.ruleDetailsPage.gotoById(ruleId);
      await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

      // Verify the compact alert summary widget is visible
      await expect(pageObjects.ruleDetailsPage.alertSummaryWidget.compact).toBeVisible();
    });

    test('should navigate to alerts tab when clicking active alerts', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.ruleDetailsPage.gotoById(ruleId);
      await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

      // Click on active alerts count
      await pageObjects.ruleDetailsPage.alertSummaryWidget.clickActiveAlerts();

      // Verify navigation to alerts tab
      const url = page.url();
      expect(url).toContain('tabId=alerts');
      expect(url).toContain('selected_options:!(active)');
    });

    test('should navigate to alerts tab when clicking total alerts', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.ruleDetailsPage.gotoById(ruleId);
      await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

      // Click on total alerts count
      await pageObjects.ruleDetailsPage.alertSummaryWidget.clickTotalAlerts();

      // Verify navigation to alerts tab
      const url = page.url();
      expect(url).toContain('tabId=alerts');
      expect(url).toContain('selected_options:!()');
    });

    test('should not show actions button for viewer user', async ({ pageObjects }) => {
      // Navigate to rule details
      await pageObjects.ruleDetailsPage.gotoById(ruleId);
      await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();

      // Verify actions button is NOT visible for viewer
      await expect(pageObjects.ruleDetailsPage.actionsButton).toBeHidden();
    });
  }
);
