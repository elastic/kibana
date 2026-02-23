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
  createExceptionListItem,
  deleteAllExceptionLists,
} from '../../../../../common/detection_engine_api_helpers';

test.describe(
  'Duplicate exception lists',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const EXCEPTION_LIST_NAME = 'A test list 2';
    const EXCEPTION_LIST_ITEM_NAME = 'Sample Exception List Item 1';
    const EXCEPTION_LIST_ITEM_NAME_2 = 'Sample Exception List Item 2';

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
    });

    test('Duplicates exception list with expired items', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const exceptionList = await createExceptionList(kbnClient, {
        list_id: 'exception_list_2',
        name: EXCEPTION_LIST_NAME,
        description: 'Test exception list',
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

      await createExceptionListItem(kbnClient, {
        list_id: 'exception_list_2',
        item_id: 'simple_list_item_1',
        name: EXCEPTION_LIST_ITEM_NAME,
        entries: [
          { field: 'host.name', operator: 'included', type: 'match_any', value: ['some host'] },
        ],
      });

      await createExceptionListItem(kbnClient, {
        list_id: 'exception_list_2',
        item_id: 'simple_list_item_2',
        name: EXCEPTION_LIST_ITEM_NAME_2,
        entries: [
          { field: 'host.name', operator: 'included', type: 'match_any', value: ['another host'] },
        ],
      });

      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Wait for table to load', async () => {
        await pageObjects.exceptions.waitForExceptionListsToLoad();
      });

      await test.step('Duplicate the list with expired items', async () => {
        const actionsBtn = page.testSubj.locator('exceptionOverflowCardButton').first();
        await actionsBtn.click();

        const duplicateBtn = page.testSubj.locator('duplicateExceptionListButton');
        await duplicateBtn.click();

        const includeExpiredCheckbox = page.testSubj.locator('includeExpiredExceptionsCheckbox');
        if (await includeExpiredCheckbox.isVisible({ timeout: 5_000 })) {
          await includeExpiredCheckbox.check();
        }

        const confirmDuplicateBtn = page.testSubj.locator('confirmDuplicateExceptionListButton');
        if (await confirmDuplicateBtn.isVisible({ timeout: 5_000 })) {
          await confirmDuplicateBtn.click();
        }
      });

      await test.step('Verify duplicate was created', async () => {
        const listNames = page.testSubj.locator('exceptionListName');
        await expect(listNames.filter({ hasText: '[Duplicate]' })).toBeVisible({ timeout: 10_000 });
      });
    });
  }
);
