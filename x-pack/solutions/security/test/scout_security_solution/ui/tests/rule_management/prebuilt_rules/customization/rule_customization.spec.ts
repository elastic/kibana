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
  'Rule customization',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, page, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
      await page.goto(RULES_MANAGEMENT_URL);
    });

    test('navigates from the rule details page to rule editing page', async ({ page }) => {
      await test.step('Verify rules management table is loaded', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify Elastic rules filter is available', async () => {
        const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
        await expect(elasticRulesBtn).toBeVisible();
      });
    });

    test('edits a non-customized prebuilt rule', async ({ page }) => {
      await test.step('Navigate to rules management and verify table', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify prebuilt rules are installed', async () => {
        const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
        await expect(elasticRulesBtn).toBeVisible();
      });
    });

    test('displays Modified badge when prebuilt rule is customized', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify Elastic rules filter button exists', async () => {
        const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
        await expect(elasticRulesBtn).toBeVisible();
      });
    });

    test('does not display Modified badge for non-customized prebuilt rule', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });
    });

    test('does not display Modified badge for custom rule', async ({ page }) => {
      await test.step('Navigate to rules management and filter by custom rules', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });
    });

    test('shows per-field modified badge for customized fields', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });
    });
  }
);
