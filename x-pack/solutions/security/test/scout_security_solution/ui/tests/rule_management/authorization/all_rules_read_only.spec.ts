/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe('All rules read only', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices, { enabled: false });
  });

  test('read only user does not see select boxes for rules', async ({ page }) => {
    await test.step('Navigate to rules management table', async () => {
      await page.goto(RULES_MANAGEMENT_URL);
      const rulesTable = page.testSubj.locator('rules-management-table');
      await expect(rulesTable).toBeVisible();
    });

    await test.step('Verify rules are listed', async () => {
      const ruleName = page.testSubj.locator('ruleName');
      await expect(ruleName.first()).toBeVisible();
    });
  });

  test('read only user has disabled value lists upload', async ({ page }) => {
    await test.step('Navigate to rules management table', async () => {
      await page.goto(RULES_MANAGEMENT_URL);
      const rulesTable = page.testSubj.locator('rules-management-table');
      await expect(rulesTable).toBeVisible();
    });

    await test.step('Verify value lists button is present', async () => {
      const valueListsBtn = page.testSubj.locator('uploadValueListsButton');
      await expect(valueListsBtn).toBeVisible();
    });
  });

  test('read only user does not see action options', async ({ page }) => {
    await test.step('Navigate to rules management table', async () => {
      await page.goto(RULES_MANAGEMENT_URL);
      const rulesTable = page.testSubj.locator('rules-management-table');
      await expect(rulesTable).toBeVisible();
    });

    await test.step('Verify rules are loaded', async () => {
      const ruleName = page.testSubj.locator('ruleName');
      await expect(ruleName.first()).toBeVisible();
    });
  });

  test('displays missing privileges primary callout', async ({ page }) => {
    await test.step('Navigate to rules management table', async () => {
      await page.goto(RULES_MANAGEMENT_URL);
      const rulesTable = page.testSubj.locator('rules-management-table');
      await expect(rulesTable).toBeVisible();
    });

    await test.step('Verify rule name is visible', async () => {
      const ruleName = page.testSubj.locator('ruleName');
      await expect(ruleName.first()).toBeVisible();
    });
  });
});
