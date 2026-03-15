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
  'Exception list details',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const LIST_NAME = 'My exception list';
    const UPDATED_LIST_NAME = 'Updated exception list';
    const LIST_DESCRIPTION = 'This is the exception list description.';
    const UPDATED_LIST_DESCRIPTION =
      'This is an updated version of the exception list description.';

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
    });

    test('Should edit list details', async ({ page, pageObjects, kbnClient }) => {
      const exceptionList = await createExceptionList(kbnClient, {
        list_id: 'exception_list_test',
        name: LIST_NAME,
        description: LIST_DESCRIPTION,
        type: 'detection',
      });

      await createRuleFromParams(kbnClient, {
        ...getNewRule(),
        rule_id: `rule-${Date.now()}`,
        exceptions_list: [
          {
            id: exceptionList.id,
            list_id: 'exception_list_test',
            type: 'detection',
            namespace_type: 'single',
          },
        ],
      });

      await pageObjects.exceptions.gotoExceptionListDetail('exception_list_test');

      await test.step('Verify list details are loaded', async () => {
        const listName = page.testSubj.locator('exceptionListManagementName');
        await expect(listName).toHaveText(LIST_NAME);

        const listDescription = page.testSubj.locator('exceptionListManagementDescription');
        await expect(listDescription).toHaveText(LIST_DESCRIPTION);
      });

      await test.step('Edit list name and description', async () => {
        const editBtn = page.testSubj.locator('exceptionListEditDetailButton');
        await editBtn.click();

        const nameInput = page.testSubj.locator('exceptionListEditNameInput');
        await nameInput.clear();
        await nameInput.fill(UPDATED_LIST_NAME);

        const descriptionInput = page.testSubj.locator('exceptionListEditDescriptionInput');
        await descriptionInput.clear();
        await descriptionInput.fill(UPDATED_LIST_DESCRIPTION);

        const saveBtn = page.testSubj.locator('exceptionListEditSaveButton');
        await saveBtn.click();
      });

      await test.step('Verify updated details', async () => {
        const listName = page.testSubj.locator('exceptionListManagementName');
        await expect(listName).toHaveText(UPDATED_LIST_NAME);

        const listDescription = page.testSubj.locator('exceptionListManagementDescription');
        await expect(listDescription).toHaveText(UPDATED_LIST_DESCRIPTION);
      });
    });
  }
);
