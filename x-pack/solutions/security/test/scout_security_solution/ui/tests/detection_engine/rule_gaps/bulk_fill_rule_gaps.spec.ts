/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Bulk fill rule gaps',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);

      for (let idx = 1; idx <= 5; idx++) {
        await createRuleFromParams(
          kbnClient,
          getNewRule({
            rule_id: String(idx),
            name: `Rule ${idx}`,
            enabled: true,
            interval: '1m',
            from: 'now-1m',
          })
        );
      }
    });

    test('schedule gap fills for enabled rules', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;

      await page.goto(RULES_MANAGEMENT_URL);
      await rulesManagementTable.waitForTableToLoad();

      await test.step('Select enabled rules and schedule bulk gap fill', async () => {
        await rulesManagementTable.selectRulesByName(['Rule 1', 'Rule 2', 'Rule 4']);
        await rulesManagementTable.bulkActionsBtn.click();
        const fillGapsAction = page.testSubj.locator('bulkFillGaps');
        await fillGapsAction.click();

        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        await confirmBtn.click();
      });

      await test.step('Verify success toast', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText('scheduled gap fills');
      });
    });

    test('schedule gap fills shows warning about disabled rules', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;

      await page.goto(RULES_MANAGEMENT_URL);
      await rulesManagementTable.waitForTableToLoad();

      await test.step('Disable some rules first', async () => {
        await rulesManagementTable.selectRulesByName(['Rule 3', 'Rule 5']);
        await rulesManagementTable.bulkActionsBtn.click();
        const disableAction = page.testSubj.locator('disableRuleBulk');
        await disableAction.click();
        await rulesManagementTable.waitForRuleToUpdate();
      });

      await test.step('Select all and schedule bulk gap fill', async () => {
        await rulesManagementTable.selectRulesByName([
          'Rule 1',
          'Rule 2',
          'Rule 3',
          'Rule 4',
          'Rule 5',
        ]);
        await rulesManagementTable.bulkActionsBtn.click();
        const fillGapsAction = page.testSubj.locator('bulkFillGaps');
        await fillGapsAction.click();

        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        await confirmBtn.click();
      });

      await test.step('Verify success toast mentions enabled rules only', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText('scheduled gap fills');
      });
    });
  }
);
