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
  'Upgrade prebuilt rules - error handling',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
    });

    test('shows an error toast when unable to upgrade a prebuilt rule', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade table or empty message is visible', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('shows an error toast when unable to upgrade selected prebuilt rules', async ({
      page,
    }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify the upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('shows an error toast when unable to upgrade all prebuilt rules', async ({ page }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify the upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('shows error and success toasts when upgrade was partially successful', async ({
      page,
    }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify the upgrade page loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });
  }
);
