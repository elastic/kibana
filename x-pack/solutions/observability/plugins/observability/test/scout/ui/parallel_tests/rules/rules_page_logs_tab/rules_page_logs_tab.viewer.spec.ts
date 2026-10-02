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
  'Rules Page - Logs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      // Navigate to the rules list page
      await pageObjects.rulesPage.goto();
      // Verify we're on the rules page
      await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
    });

    test('opens Logs from the More menu and displays the event log table', async ({
      pageObjects,
    }) => {
      await pageObjects.rulesPage.openLogsFromMoreMenu();

      // Verify the event log table is visible
      await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();

      await pageObjects.rulesPage.expectLogsPageActive();
    });

    test('loads Logs content when navigating directly via URL', async ({ pageObjects }) => {
      await pageObjects.rulesPage.gotoLogsPage();

      // Verify the event log table loads correctly
      await expect(pageObjects.rulesPage.eventLogTable).toBeVisible();
    });

    test('navigates to the Logs URL from the More menu', async ({ page, pageObjects }) => {
      await pageObjects.rulesPage.openLogsFromMoreMenu();

      const url = page.url();
      expect(url).toContain('logs');
    });

    test('should navigate to rule details when clicking on a rule in event logs', async ({
      pageObjects,
    }) => {
      await pageObjects.rulesPage.openLogsFromMoreMenu();

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
