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

test.describe(
  'Rules Page - Logs Tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      // Navigate to the rules list page
      await pageObjects.rulesPage.goto();
      // Verify we're on the rules page
      await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
    });

    test('should navigate to logs tab and display event log table', async ({ pageObjects }) => {
      // Click the logs tab
      await pageObjects.rulesPage.clickLogsTab();

      // Verify the event log table is visible
      await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();

      // Verify the tab is marked as active
      await pageObjects.rulesPage.expectLogsTabActive();
    });

    test('should load logs tab content when navigating directly via URL', async ({
      pageObjects,
    }) => {
      // Navigate directly to logs tab via URL
      await pageObjects.rulesPage.gotoLogsTab();

      // Verify the event log table loads correctly
      await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();
    });

    test('should persist logs tab selection in URL', async ({ page, pageObjects }) => {
      // Navigate to logs tab
      await pageObjects.rulesPage.clickLogsTab();

      // Verify URL contains logs tab indicator
      const url = page.url();
      expect(url).toContain('logs');
    });

    test('should navigate to rule details when clicking on a rule in event logs', async ({
      pageObjects,
    }) => {
      // Navigate to logs tab
      await pageObjects.rulesPage.clickLogsTab();

      // Wait for logs table to load
      await pageObjects.rulesPage.waitForLogsTableToLoad();

      // Click on one of the rule links in the event logs
      const ruleLinks = await pageObjects.rulesPage.getLogsTableRuleLinks(
        RULE_NAMES.FIRST_RULE_TEST
      );
      expect(ruleLinks.length).toBeGreaterThan(0);
      await pageObjects.rulesPage.clickOnRuleInEventLogs(ruleLinks[0]);

      // Verify we navigated to the rule details page
      await expect(pageObjects.rulesPage.ruleDetails).toBeVisible();
    });
  }
);
