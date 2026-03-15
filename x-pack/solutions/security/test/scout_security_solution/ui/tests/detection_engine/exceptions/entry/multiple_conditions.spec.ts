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
  'Exception multiple conditions',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates exception with AND conditions generating one exception', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          query: 'agent.name:*',
          index: ['exceptions*'],
          exceptions_list: [],
          rule_id: `rule-${Date.now()}`,
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Open exception flyout', async () => {
        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Add item name and AND conditions', async () => {
        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill('My item name');

        await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is', 'foo');

        const addAndBtn = page.testSubj.locator('exceptionsAndButton');
        await addAndBtn.click();

        await pageObjects.exceptions.fillExceptionEntry('@timestamp', 'is', '123');
      });

      await test.step('Submit and verify one exception created', async () => {
        await pageObjects.exceptions.submitException();

        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toHaveCount(1);
        await expect(page.testSubj.locator('exceptionItemCardHeader')).toContainText(
          'My item name'
        );
      });
    });

    test('Creates exception with OR conditions generating multiple exceptions', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          query: 'agent.name:*',
          index: ['exceptions*'],
          exceptions_list: [],
          rule_id: `rule-${Date.now()}`,
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Open exception flyout', async () => {
        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Add item name and OR conditions', async () => {
        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill('My item name');

        await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is', 'foo');

        const addOrBtn = page.testSubj.locator('exceptionsOrButton');
        await addOrBtn.click();

        await pageObjects.exceptions.fillExceptionEntry('@timestamp', 'is', '123');
      });

      await test.step('Submit and verify two exceptions created', async () => {
        await pageObjects.exceptions.submitException();

        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toHaveCount(2);
      });
    });
  }
);
