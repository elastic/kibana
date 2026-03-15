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
import {
  createExceptionList,
  deleteAllExceptionLists,
} from '../../../../../common/detection_engine_api_helpers';

test.describe(
  'Manage lists',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const EXCEPTION_LIST_NAME = 'My test list';
    const EXCEPTION_LIST_TO_DUPLICATE_NAME = 'A test list 2';

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
    });

    test('Exports exception list', async ({ page, pageObjects, kbnClient }) => {
      await createExceptionList(kbnClient, {
        list_id: 'exception_list_1',
        name: EXCEPTION_LIST_NAME,
        description: 'Test list',
        type: 'detection',
      });

      const exceptionList2 = await createExceptionList(kbnClient, {
        list_id: 'exception_list_2',
        name: EXCEPTION_LIST_TO_DUPLICATE_NAME,
        description: 'Test list 2',
        type: 'detection',
      });

      await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
        exceptions_list: [
          {
            id: exceptionList2.id,
            list_id: 'exception_list_2',
            type: 'detection',
            namespace_type: 'single',
          },
        ],
      });

      await pageObjects.exceptions.gotoSharedExceptionLists();
      await pageObjects.exceptions.waitForExceptionListsToLoad();

      await test.step('Export list', async () => {
        const actionsBtn = page.testSubj.locator('exceptionOverflowCardButton').first();
        await actionsBtn.click();

        const exportBtn = page.testSubj.locator('exportExceptionListButton');
        await exportBtn.click();

        const toast = page.testSubj.locator('globalToastList');
        await expect(toast).toContainText('exported successfully');
      });
    });

    test('Creates shared exception list', async ({ page, pageObjects }) => {
      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Create new shared list', async () => {
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

      await test.step('Verify list created', async () => {
        const listName = page.testSubj.locator('exceptionListManagementName');
        await expect(listName).toHaveText('Newly created list');
      });
    });

    test('Deletes exception list without rule reference', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      await createExceptionList(kbnClient, {
        list_id: 'exception_list_1',
        name: EXCEPTION_LIST_NAME,
        description: 'Test list',
        type: 'detection',
      });

      await pageObjects.exceptions.gotoSharedExceptionLists();
      await pageObjects.exceptions.waitForExceptionListsToLoad();

      await test.step('Delete exception list', async () => {
        const actionsBtn = page.testSubj.locator('exceptionOverflowCardButton').first();
        await actionsBtn.click();

        const deleteBtn = page.testSubj.locator('deleteExceptionListButton');
        await deleteBtn.click();

        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        await confirmBtn.click();
      });
    });

    test('Links rules to shared exception list', async ({ page, pageObjects, kbnClient }) => {
      const exceptionList = await createExceptionList(kbnClient, {
        list_id: 'exception_list_2',
        name: EXCEPTION_LIST_TO_DUPLICATE_NAME,
        description: 'Test list',
        type: 'detection',
      });

      await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
        exceptions_list: [
          {
            id: exceptionList.id,
            list_id: 'exception_list_2',
            type: 'detection',
            namespace_type: 'single',
          },
        ],
      });

      await createRuleFromParams(kbnClient, {
        ...getNewRule({ name: 'Another rule' }),
        rule_id: `rule2-${Date.now()}`,
      });

      await pageObjects.exceptions.gotoSharedExceptionLists();
      await pageObjects.exceptions.waitForExceptionListsToLoad();

      await test.step('Open link rules flyout', async () => {
        const actionsBtn = page.testSubj.locator('exceptionOverflowCardButton').first();
        await actionsBtn.click();

        const linkBtn = page.testSubj.locator('linkExceptionListToRuleButton');
        await linkBtn.click();
      });

      await test.step('Link additional rule', async () => {
        const linkRulesFlyout = page.testSubj.locator('linkRulesToExceptionListFlyout');
        await expect(linkRulesFlyout).toBeVisible({ timeout: 10_000 });

        const ruleCheckbox = linkRulesFlyout.locator('input[type="checkbox"]').first();
        await ruleCheckbox.check();

        const saveBtn = page.testSubj.locator('saveLinkedRulesButton');
        await saveBtn.click();
      });
    });
  }
);
