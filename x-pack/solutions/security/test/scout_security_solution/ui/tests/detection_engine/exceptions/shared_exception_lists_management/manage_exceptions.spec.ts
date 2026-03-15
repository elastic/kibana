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
import { deleteAllExceptionLists } from '../../../../common/detection_engine_api_helpers';

test.describe(
  'Manage exceptions',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
    });

    test('Creates exception item from shared exception list page linked to a rule', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const exceptionName = 'My item name';
      const FIELD = 'agent.name';

      await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
      });

      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Open create exception item from header menu', async () => {
        const createBtn = page.testSubj.locator('exceptionsCreateSharedListButton');
        await createBtn.click();

        const addItemOption = page.testSubj.locator('exceptionsCreateSharedListItemOption');
        if (await addItemOption.isVisible({ timeout: 5_000 })) {
          await addItemOption.click();
        }
      });

      await test.step('Fill exception details and link to rule', async () => {
        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill(exceptionName);

        await pageObjects.exceptions.fillExceptionEntry(FIELD, 'is', 'foo');

        const confirmBtn = page.testSubj.locator('addExceptionConfirmButton');
        await expect(confirmBtn).toBeDisabled();

        const linkRuleRadio = page.testSubj.locator('linkToRuleRadio');
        if (await linkRuleRadio.isVisible()) {
          await linkRuleRadio.click();
          const ruleOption = page.getByRole('option').first();
          await ruleOption.click();
        }

        await expect(confirmBtn).toBeEnabled();
        await confirmBtn.click();
      });
    });

    test('Creates exception item linked to shared list, edits and deletes it', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
      });

      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Create shared list', async () => {
        const createBtn = page.testSubj.locator('exceptionsCreateSharedListButton');
        await createBtn.click();

        const createListOption = page.testSubj.locator('exceptionsCreateSharedListOption');
        if (await createListOption.isVisible({ timeout: 5_000 })) {
          await createListOption.click();
        }

        const listNameInput = page.testSubj.locator('exceptionListNameInput');
        await listNameInput.fill('Newly created list');

        const listDescInput = page.testSubj.locator('exceptionListDescriptionInput');
        await listDescInput.fill('This is my list.');

        const confirmBtn = page.testSubj.locator('createSharedExceptionListConfirmButton');
        await confirmBtn.click();
      });

      await test.step('Verify list creation', async () => {
        const listName = page.testSubj.locator('exceptionListManagementName');
        await expect(listName).toHaveText('Newly created list');
      });
    });
  }
);
