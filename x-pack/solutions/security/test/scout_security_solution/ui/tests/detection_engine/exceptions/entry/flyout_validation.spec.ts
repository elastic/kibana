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
import {
  createExceptionList,
  deleteAllExceptionLists,
} from '../../../../common/detection_engine_api_helpers';
import { SECURITY_ARCHIVES, loadEsArchive, unloadEsArchive } from '../../../../common/es_helpers';

test.describe(
  'Exception flyout validation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test.afterEach(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test('Validates empty entry values correctly', async ({ page, pageObjects, kbnClient }) => {
      const exceptionList = await createExceptionList(kbnClient, {
        list_id: 'test_exception_list',
        name: 'Test Exception List',
        description: 'Test exception list for validation',
        type: 'detection',
      });

      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          index: ['auditbeat-*', 'exceptions-*'],
          enabled: false,
          exceptions_list: [
            {
              id: exceptionList.id,
              list_id: 'test_exception_list',
              type: 'detection',
              namespace_type: 'single',
            },
          ],
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Open exception flyout from empty prompt', async () => {
        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Add item name', async () => {
        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill('My item name');
      });

      await test.step('Add entry with value - submit should enable', async () => {
        await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is', 'test');
        const confirmBtn = page.testSubj.locator('addExceptionConfirmButton');
        await expect(confirmBtn).toBeEnabled();
      });
    });

    test('Validates custom fields correctly', async ({ page, pageObjects, kbnClient }) => {
      const exceptionList = await createExceptionList(kbnClient, {
        list_id: 'test_exception_list_custom',
        name: 'Test Exception List',
        description: 'Test exception list',
        type: 'detection',
      });

      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          index: ['auditbeat-*', 'exceptions-*'],
          enabled: false,
          exceptions_list: [
            {
              id: exceptionList.id,
              list_id: 'test_exception_list_custom',
              type: 'detection',
              namespace_type: 'single',
            },
          ],
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
      await addExceptionBtn.click();

      const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
      await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

      const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
      await itemNameInput.fill('My item name');

      await pageObjects.exceptions.fillExceptionEntry('blooberty', 'is', 'blah');
      const confirmBtn = page.testSubj.locator('addExceptionConfirmButton');
      await expect(confirmBtn).toBeEnabled();
    });
  }
);
