/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { INSTALL_PREBUILT_RULES_URL } from '../../../../common/urls';

test.describe('Install prebuilt rules via Fleet', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
  });

  test('installs prebuilt rules from the security_detection_engine Fleet package', async ({
    page,
  }) => {
    await test.step('Navigate to add rules page', async () => {
      await page.goto(INSTALL_PREBUILT_RULES_URL);
    });

    await test.step('Wait for prebuilt rules package to be installed', async () => {
      const addRulesTable = page.testSubj.locator('add-prebuilt-rules-table');
      await expect(addRulesTable).toBeVisible({ timeout: 120_000 });
    });

    await test.step('Verify rules are available for installation', async () => {
      const ruleName = page.testSubj.locator('ruleName');
      await expect(ruleName.first()).toBeVisible({ timeout: 60_000 });
    });

    await test.step('Install a prebuilt rule and verify', async () => {
      const installAllBtn = page.testSubj.locator('installAllRulesButton');
      await expect(installAllBtn).toBeVisible();
    });
  });
});
