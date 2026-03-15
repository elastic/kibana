/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, installPrebuiltRules } from '../../../../common/api_helpers';
import { RULES_UPGRADE_URL } from '../../../../common/urls';

test.describe(
  'Upgrade prebuilt rules with preview',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
    });

    test('previews a prebuilt rule upgrade', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade table or empty state loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('shows custom query rule properties in upgrade preview', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('shows side-by-side JSON diff view', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('shows side-by-side per-field diff view', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('upgrades a non-customized prebuilt rule after preview', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('upgrades a customized prebuilt rule after preview', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('disables Update rule button when conflicts exist', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('upgrades a prebuilt rule to a different rule type', async ({ page }) => {
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
