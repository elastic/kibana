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
  'Filter exception lists table',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const EXCEPTION_LIST_NAME = 'My test list';
    const EXCEPTION_LIST_NAME_TWO = 'A test list 2';

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
    });

    test('Filters exception lists on search', async ({ page, pageObjects, kbnClient }) => {
      const exceptionList2 = await createExceptionList(kbnClient, {
        list_id: 'exception_list_2',
        name: EXCEPTION_LIST_NAME_TWO,
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

      await createExceptionList(kbnClient, {
        list_id: 'exception_list_1',
        name: EXCEPTION_LIST_NAME,
        description: 'Test list 1',
        type: 'detection',
      });

      await pageObjects.exceptions.gotoSharedExceptionLists();
      await pageObjects.exceptions.waitForExceptionListsToLoad();

      await test.step('Search for single word', async () => {
        await pageObjects.exceptions.searchExceptionLists('Endpoint');
        const showingText = page.testSubj.locator('exceptionsTableShowingLists');
        await expect(showingText).toContainText('1');
      });

      await test.step('Search for test', async () => {
        await pageObjects.exceptions.searchExceptionLists('test');
        const showingText = page.testSubj.locator('exceptionsTableShowingLists');
        await expect(showingText).toContainText('2');
      });

      await test.step('Exact phrase search', async () => {
        await pageObjects.exceptions.searchExceptionLists(`"${EXCEPTION_LIST_NAME}"`);
        const showingText = page.testSubj.locator('exceptionsTableShowingLists');
        await expect(showingText).toContainText('1');

        const listName = page.testSubj.locator('exceptionListName');
        await expect(listName).toHaveText(EXCEPTION_LIST_NAME);
      });

      await test.step('Field search', async () => {
        await pageObjects.exceptions.searchExceptionLists('list_id:endpoint_list');
        const showingText = page.testSubj.locator('exceptionsTableShowingLists');
        await expect(showingText).toContainText('1');

        const listName = page.testSubj.locator('exceptionListName');
        await expect(listName).toHaveText('Endpoint Security Exception List');
      });
    });
  }
);
