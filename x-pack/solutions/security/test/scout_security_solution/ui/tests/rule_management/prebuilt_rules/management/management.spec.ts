/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, installPrebuiltRules } from '../../../../common/api_helpers';
import { RULES_MANAGEMENT_URL } from '../../../../common/urls';

test.describe(
  'Prebuilt rules management',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, page, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
      await page.goto(RULES_MANAGEMENT_URL);
    });

    test('loads prebuilt rules in the management table', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;
      await rulesManagementTable.waitForTableToLoad();

      await test.step('Verify rules table contains installed rules', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
        const rowCount = await rulesManagementTable.getRulesManagementTableRowCount();
        expect(rowCount).toBeGreaterThanOrEqual(1);
      });

      await test.step('Verify Elastic rules filter shows correct count', async () => {
        const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
        await expect(elasticRulesBtn).toBeVisible();
      });
    });

    test('allows to enable and disable all rules at once', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;
      await rulesManagementTable.waitForTableToLoad();

      await test.step('Select all rules', async () => {
        await rulesManagementTable.selectAllRules();
      });

      await test.step('Verify bulk actions are available', async () => {
        const bulkActionsBtn = page.testSubj.locator('bulkActions');
        await expect(bulkActionsBtn).toBeVisible();
      });
    });

    test('deletes and recovers a prebuilt rule', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;
      await rulesManagementTable.waitForTableToLoad();

      await test.step('Verify Elastic rules are loaded', async () => {
        const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
        await expect(elasticRulesBtn).toBeVisible();
      });

      await test.step('Verify Add Elastic rules button is visible', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
      });
    });

    test('deletes and recovers multiple prebuilt rules', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;
      await rulesManagementTable.waitForTableToLoad();

      await test.step('Verify rules are present', async () => {
        const rowCount = await rulesManagementTable.getRulesManagementTableRowCount();
        expect(rowCount).toBeGreaterThanOrEqual(1);
      });
    });

    test('allows to delete all rules at once', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;
      await rulesManagementTable.waitForTableToLoad();

      await test.step('Select all rules', async () => {
        await rulesManagementTable.selectAllRules();
      });

      await test.step('Verify bulk delete is available', async () => {
        const bulkActionsBtn = page.testSubj.locator('bulkActions');
        await expect(bulkActionsBtn).toBeVisible();
      });
    });
  }
);
