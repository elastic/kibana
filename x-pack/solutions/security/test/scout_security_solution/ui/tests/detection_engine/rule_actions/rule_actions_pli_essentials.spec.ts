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
  'Rule actions PLI essentials product tier',
  {
    tag: tags.serverless.security.essentials,
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getNewRule());
    });

    test('only 3 rule actions should be available', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;

      await test.step('Navigate to rules and edit first rule', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        await rulesManagementTable.waitForTableToLoad();

        const collapsedActionBtn = page.testSubj.locator('euiCollapsedItemActionsButton').first();
        await collapsedActionBtn.click();

        const editAction = page.testSubj.locator('editRuleAction');
        await editAction.click();
      });

      await test.step('Navigate to actions step', async () => {
        const actionsTab = page.testSubj.locator('edit-rule-actions-tab');
        await actionsTab.click();
      });

      await test.step('Verify only essentials-tier actions are visible', async () => {
        const indexAction = page.testSubj.locator('.index-siem-ActionTypeSelectOption');
        await expect(indexAction).toBeVisible();

        const slackAction = page.testSubj.locator('.slack_api-siem-ActionTypeSelectOption');
        await expect(slackAction).toBeVisible();

        const emailAction = page.testSubj.locator('.email-siem-ActionTypeSelectOption');
        await expect(emailAction).toBeVisible();
      });

      await test.step('Verify complete-tier actions are not visible', async () => {
        const webhookAction = page.testSubj.locator('.webhook-siem-ActionTypeSelectOption');
        await expect(webhookAction).toBeHidden();

        const xmattersAction = page.testSubj.locator('.xmatters-siem-ActionTypeSelectOption');
        await expect(xmattersAction).toBeHidden();

        const serverLogAction = page.testSubj.locator('.server-log-siem-ActionTypeSelectOption');
        await expect(serverLogAction).toBeHidden();

        const casesAction = page.testSubj.locator('.cases-siem-ActionTypeSelectOption');
        await expect(casesAction).toBeHidden();
      });
    });
  }
);
