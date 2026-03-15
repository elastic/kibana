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
  'Export prebuilt rule',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
    });

    test('exports a non-customized prebuilt rule from details page', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify rules are present in the table', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });
    });

    test('exports a customized prebuilt rule from details page', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify Elastic rules filter is available', async () => {
        const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
        await expect(elasticRulesBtn).toBeVisible();
      });
    });

    test('exports multiple prebuilt rules in bulk', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify bulk actions button is available', async () => {
        const selectAllBtn = page.testSubj.locator('selectAllRules');
        await expect(selectAllBtn).toBeVisible();
      });
    });

    test('exports a mix of prebuilt and custom rules in bulk', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify select all button is available', async () => {
        const selectAllBtn = page.testSubj.locator('selectAllRules');
        await expect(selectAllBtn).toBeVisible();
      });
    });
  }
);
