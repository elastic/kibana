/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams } from '../../../../common/rule_api_helpers';
import { getNewRule } from '../../../../common/rule_objects';

test.describe(
  'Endpoint exceptions from alerts table',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const ITEM_NAME = 'Sample Exception List Item';

    test.beforeEach(async ({ browserAuth, apiServices, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates endpoint exception from alert overflow menu and closes matching alert', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
        query: 'event.kind:signal',
        enabled: true,
      });

      await pageObjects.ruleDetails.goto(created.id, 'alerts');

      await test.step('Wait for alerts to populate', async () => {
        const alertsCount = page.testSubj.locator('alertsCount');
        await expect(alertsCount).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Open endpoint exception from alert actions', async () => {
        const firstAlertActions = page.testSubj.locator('expand-event').first();
        await firstAlertActions.click();

        const addEndpointExceptionBtn = page.testSubj.locator('addEndpointExceptionBtn');
        if (await addEndpointExceptionBtn.isVisible({ timeout: 5_000 })) {
          await addEndpointExceptionBtn.click();
          const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
          await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

          const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
          await itemNameInput.fill(ITEM_NAME);

          const closeSingleAlertCheckbox = page.testSubj.locator('closeSingleAlert');
          if (await closeSingleAlertCheckbox.isVisible()) {
            await closeSingleAlertCheckbox.check();
          }

          await page.testSubj.locator('addExceptionConfirmButton').click();
        }
      });
    });
  }
);
