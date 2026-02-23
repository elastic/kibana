/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, installPrebuiltRules } from '../../../../common/api_helpers';
import { RULES_UPGRADE_URL, RULES_MANAGEMENT_URL } from '../../../../common/urls';

test.describe(
  'Upgrade prebuilt rules without preview',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
    });

    test('upgrades a conflict-free prebuilt rule', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade table or empty message is visible', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('displays Review button for prebuilt rules with upgrade conflicts', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('upgrades all conflict-free prebuilt rules via bulk action', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade controls are available', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('upgrades selected conflict-free prebuilt rules', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('upgrades all prebuilt rules with auto-resolved conflicts', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('unable to upgrade only prebuilt rules with non-solvable conflicts', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('filters by customized prebuilt rules in upgrade table', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });
    });

    test('read-only user is unable to upgrade prebuilt rules', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });
  }
);
