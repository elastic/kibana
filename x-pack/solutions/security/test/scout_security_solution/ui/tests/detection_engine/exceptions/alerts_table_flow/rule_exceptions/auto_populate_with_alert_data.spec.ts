/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../../common/api_helpers';
import { createRuleFromParams } from '../../../../../common/rule_api_helpers';
import { getNewRule } from '../../../../../common/rule_objects';

test.describe(
  'Auto populate exception with alert data',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const ITEM_NAME = 'Sample Exception Item';

    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates rule exception from alert actions with auto-populated fields', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
        enabled: true,
      });

      await pageObjects.ruleDetails.goto(created.id, 'alerts');

      await test.step('Wait for alerts', async () => {
        const alertsCount = page.testSubj.locator('alertsCount');
        await expect(alertsCount).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Add exception from first alert', async () => {
        const firstAlertActions = page.testSubj.locator('expand-event').first();
        await firstAlertActions.click();

        const addExceptionBtn = page.testSubj.locator('addRuleExceptionButton');
        if (await addExceptionBtn.isVisible({ timeout: 5_000 })) {
          await addExceptionBtn.click();

          const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
          await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

          const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
          await itemNameInput.fill(ITEM_NAME);

          await page.testSubj.locator('addExceptionConfirmButton').click();
        }
      });

      await test.step('Verify exception on rule exceptions tab', async () => {
        await pageObjects.ruleDetails.goToExceptionsTab();
        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toBeVisible({ timeout: 10_000 });
      });
    });

    test('Creates rule exception from alert details flyout take action button', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const ITEM_NAME_EDIT = 'Sample Exception Item Edit';

      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
        enabled: true,
      });

      await pageObjects.ruleDetails.goto(created.id, 'alerts');

      await test.step('Wait for alerts and open flyout', async () => {
        const alertsCount = page.testSubj.locator('alertsCount');
        await expect(alertsCount).toBeVisible({ timeout: 60_000 });

        const firstAlert = page.testSubj.locator('expandableRowCell').first();
        await firstAlert.click();
      });

      await test.step('Open exception from flyout take action', async () => {
        const takeActionBtn = page.testSubj.locator('take-action-dropdown-btn');
        if (await takeActionBtn.isVisible({ timeout: 5_000 })) {
          await takeActionBtn.click();

          const addExceptionBtn = page.testSubj.locator('add-exception-menu-item');
          if (await addExceptionBtn.isVisible()) {
            await addExceptionBtn.click();

            const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
            await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

            const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
            await itemNameInput.fill(ITEM_NAME_EDIT);

            await page.testSubj.locator('addExceptionConfirmButton').click();
          }
        }
      });

      await test.step('Verify exception on rule exceptions tab', async () => {
        await pageObjects.ruleDetails.goToExceptionsTab();
        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toBeVisible({ timeout: 10_000 });
      });
    });
  }
);
