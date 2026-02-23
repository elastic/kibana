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
  createExceptionListItem,
  deleteAllExceptionLists,
} from '../../../../common/detection_engine_api_helpers';

test.describe(
  'Exception read only view',
  {
    tag: [...tags.stateful.classic],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
    });

    test('Read-only user cannot add exceptions from empty viewer', async ({
      page,
      pageObjects,
      kbnClient,
      browserAuth,
    }) => {
      const exceptionList = await createExceptionList(kbnClient, {
        list_id: 'test_exception_list',
        name: 'Test Exception List',
        description: 'Test exception list',
        type: 'detection',
      });

      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          name: 'Test exceptions rule',
          query: 'agent.name:*',
          index: ['exceptions*'],
          exceptions_list: [
            {
              id: exceptionList.id,
              list_id: 'test_exception_list',
              type: 'detection',
              namespace_type: 'single',
            },
          ],
          rule_id: `rule-${Date.now()}`,
        }),
      });

      await browserAuth.loginAsViewer();
      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Verify empty prompt shows with disabled button', async () => {
        const emptyPrompt = page.testSubj.locator('exceptionsEmptyPrompt');
        await expect(emptyPrompt).toBeVisible({ timeout: 10_000 });

        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await expect(addExceptionBtn).toBeDisabled();
      });
    });

    test('Read-only user cannot take actions on existing exception', async ({
      page,
      pageObjects,
      kbnClient,
      browserAuth,
    }) => {
      const exceptionList = await createExceptionList(kbnClient, {
        list_id: 'test_exception_list_ro',
        name: 'Test Exception List',
        description: 'Test exception list',
        type: 'detection',
      });

      await createExceptionListItem(kbnClient, {
        list_id: 'test_exception_list_ro',
        item_id: 'simple_list_item',
        name: 'Sample Exception List Item',
        entries: [
          { field: 'unique_value.test', operator: 'included', type: 'match_any', value: ['bar'] },
        ],
      });

      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          name: 'Test exceptions rule',
          query: 'agent.name:*',
          index: ['exceptions*'],
          exceptions_list: [
            {
              id: exceptionList.id,
              list_id: 'test_exception_list_ro',
              type: 'detection',
              namespace_type: 'single',
            },
          ],
          rule_id: `rule-${Date.now()}`,
        }),
      });

      await browserAuth.loginAsViewer();
      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Verify exception items are visible but actions are disabled', async () => {
        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toHaveCount(1);

        const actionsBtn = page.testSubj.locator('exceptionItemCardActions');
        await expect(actionsBtn).toBeDisabled();
      });
    });
  }
);
