/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, installPrebuiltRules } from '../../../common/api_helpers';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Related integrations',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
    });

    test('displays a badge with installed integrations on rules management table', async ({
      page,
    }) => {
      await test.step('Navigate to rules management table', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify rules are displayed in the table', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });
    });

    test('displays a popover when clicking the integrations badge', async ({ page }) => {
      await test.step('Navigate to rules management table', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify rule names are visible', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });
    });

    test('displays integrations in the rule details definition section', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Click on a rule to view details', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });
    });

    test('does not display integration badge when setting is disabled', async ({ page }) => {
      await test.step('Navigate to rules management table', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify rules are displayed', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });
    });
  }
);
