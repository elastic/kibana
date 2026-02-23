/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import {
  deleteAllExceptionLists,
  createExceptionList,
  createExceptionListItem,
} from '../../../../common/detection_engine_api_helpers';
import { createRuleFromParams } from '../../../../common/rule_api_helpers';
import { getNewRule } from '../../../../common/rule_objects';
import { SECURITY_ARCHIVES, loadEsArchive, unloadEsArchive } from '../../../../common/es_helpers';

test.describe(
  'Add/edit exception from rule details',
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

    test.describe('existing list and items', () => {
      test('Edits an exception item', async ({ page, pageObjects, kbnClient }) => {
        const NEW_ITEM_NAME = 'Exception item-EDITED';
        const ITEM_NAME = 'Sample Exception List Item 2';
        const ITEM_FIELD = 'unique_value.test';

        const exceptionList = await createExceptionList(kbnClient, {
          list_id: 'test_exception_list',
          name: 'Test Exception List',
          description: 'Test exception list',
          type: 'detection',
        });

        await createExceptionListItem(kbnClient, {
          list_id: 'test_exception_list',
          item_id: 'simple_list_item',
          name: ITEM_NAME,
          entries: [{ field: ITEM_FIELD, operator: 'included', type: 'match_any', value: ['foo'] }],
        });

        const created = await createRuleFromParams(kbnClient, {
          ...getNewRule({
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

        await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

        await test.step('Verify existing exception item displays', async () => {
          const exceptionItems = page.testSubj.locator('exceptionItemCard');
          await expect(exceptionItems).toHaveCount(1);
          await expect(page.testSubj.locator('exceptionItemCardHeader')).toContainText(ITEM_NAME);
        });

        await test.step('Open edit flyout and modify item', async () => {
          const actionsBtn = page.testSubj.locator('exceptionItemCardActions').first();
          await actionsBtn.click();
          const editBtn = page.testSubj.locator('exceptionItemEditButton');
          await editBtn.click();

          const exceptionFlyout = page.testSubj.locator('editExceptionFlyout');
          await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

          const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
          await itemNameInput.clear();
          await itemNameInput.fill(NEW_ITEM_NAME);

          const saveBtn = page.testSubj.locator('editExceptionConfirmButton');
          await saveBtn.click();
        });

        await test.step('Verify updated exception item', async () => {
          const exceptionItems = page.testSubj.locator('exceptionItemCard');
          await expect(exceptionItems).toHaveCount(1);
          await expect(page.testSubj.locator('exceptionItemCardHeader')).toContainText(
            NEW_ITEM_NAME
          );
        });
      });

      test.describe('rule with existing shared exceptions', () => {
        test('Creates an exception item to add to shared list', async ({
          page,
          pageObjects,
          kbnClient,
        }) => {
          const exceptionList = await createExceptionList(kbnClient, {
            list_id: 'test_exception_list',
            name: 'Test Exception List',
            description: 'Test exception list',
            type: 'detection',
          });

          await createExceptionListItem(kbnClient, {
            list_id: 'test_exception_list',
            item_id: 'simple_list_item',
            name: 'Sample Exception List Item',
            entries: [
              {
                field: 'unique_value.test',
                operator: 'included',
                type: 'match_any',
                value: ['foo'],
              },
            ],
          });

          const created = await createRuleFromParams(kbnClient, {
            ...getNewRule({
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

          await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

          await test.step('Verify existing exception item displays', async () => {
            const exceptionItems = page.testSubj.locator('exceptionItemCard');
            await expect(exceptionItems).toHaveCount(1);
          });

          await test.step('Open add exception flyout and fill entry', async () => {
            const addBtn = page.testSubj.locator('exceptionsHeaderAddExceptionBtn');
            await addBtn.click();

            const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
            await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

            await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is one of', 'bar');

            const confirmBtn = page.testSubj.locator('addExceptionConfirmButton');
            await expect(confirmBtn).toBeDisabled();

            const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
            await itemNameInput.fill('My item name');

            const sharedListRadio = page.testSubj.locator('addToListsRadio');
            if (await sharedListRadio.isVisible()) {
              await sharedListRadio.click();
            }

            const closeAlertsCheckbox = page.testSubj.locator(
              'bulkCloseAlertOnAddExceptionCheckbox'
            );
            await expect(closeAlertsCheckbox).toBeVisible();
            await expect(closeAlertsCheckbox).toBeEnabled();

            await pageObjects.exceptions.submitException();
          });

          await test.step('Verify new exception item added', async () => {
            const exceptionItems = page.testSubj.locator('exceptionItemCard');
            await expect(exceptionItems).toHaveCount(2);
          });
        });

        test('Creates an exception item to add to rule only', async ({
          page,
          pageObjects,
          kbnClient,
        }) => {
          const exceptionList = await createExceptionList(kbnClient, {
            list_id: 'test_exception_list',
            name: 'Test Exception List',
            description: 'Test exception list',
            type: 'detection',
          });

          await createExceptionListItem(kbnClient, {
            list_id: 'test_exception_list',
            item_id: 'simple_list_item',
            name: 'Sample Exception List Item',
            entries: [
              {
                field: 'unique_value.test',
                operator: 'included',
                type: 'match_any',
                value: ['foo'],
              },
            ],
          });

          const created = await createRuleFromParams(kbnClient, {
            ...getNewRule({
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

          await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

          await test.step('Verify existing exception item displays', async () => {
            const exceptionItems = page.testSubj.locator('exceptionItemCard');
            await expect(exceptionItems).toHaveCount(1);
          });

          await test.step('Open add exception flyout and add to rule only', async () => {
            const addBtn = page.testSubj.locator('exceptionsHeaderAddExceptionBtn');
            await addBtn.click();

            const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
            await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

            await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is one of', 'bar');

            const confirmBtn = page.testSubj.locator('addExceptionConfirmButton');
            await expect(confirmBtn).toBeDisabled();

            const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
            await itemNameInput.fill('My item name');

            const addToRuleRadio = page.testSubj.locator('addToRuleRadio');
            await addToRuleRadio.click();

            const closeAlertsCheckbox = page.testSubj.locator(
              'bulkCloseAlertOnAddExceptionCheckbox'
            );
            await expect(closeAlertsCheckbox).toBeVisible();
            await expect(closeAlertsCheckbox).toBeEnabled();

            await pageObjects.exceptions.submitException();
          });

          await test.step('Verify new exception item added', async () => {
            const exceptionItems = page.testSubj.locator('exceptionItemCard');
            await expect(exceptionItems).toHaveCount(2);
          });
        });

        test('Can search for items', async ({ page, pageObjects, kbnClient }) => {
          const exceptionList = await createExceptionList(kbnClient, {
            list_id: 'test_exception_list',
            name: 'Test Exception List',
            description: 'Test exception list',
            type: 'detection',
          });

          await createExceptionListItem(kbnClient, {
            list_id: 'test_exception_list',
            item_id: 'simple_list_item',
            name: 'Sample Exception List Item',
            entries: [
              {
                field: 'unique_value.test',
                operator: 'included',
                type: 'match_any',
                value: ['foo'],
              },
            ],
          });

          const created = await createRuleFromParams(kbnClient, {
            ...getNewRule({
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

          await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

          await test.step('Verify existing exception item displays', async () => {
            const exceptionItems = page.testSubj.locator('exceptionItemCard');
            await expect(exceptionItems).toHaveCount(1);
          });

          await test.step('Search for matching exception value', async () => {
            const searchInput = page.testSubj.locator('exceptionsHeaderSearch');
            await searchInput.fill('foo');
            await searchInput.press('Enter');

            const exceptionItems = page.testSubj.locator('exceptionItemCard');
            await expect(exceptionItems).toHaveCount(1);
          });

          await test.step('Search for non-matching value shows empty result', async () => {
            const searchInput = page.testSubj.locator('exceptionsHeaderSearch');
            await searchInput.clear();
            await searchInput.fill('abc');
            await searchInput.press('Enter');

            const emptyPrompt = page.testSubj.locator('exceptionsEmptySearchPrompt');
            await expect(emptyPrompt).toBeVisible();
          });
        });
      });
    });

    test.describe('rule without existing exceptions', () => {
      test('Creates exception item with bulk close from rule details', async ({
        page,
        pageObjects,
        kbnClient,
      }) => {
        const created = await createRuleFromParams(kbnClient, {
          ...getNewRule({
            query: 'agent.name:*',
            index: ['exceptions*'],
            interval: '10s',
            rule_id: `rule-${Date.now()}`,
          }),
        });

        await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

        await test.step('Verify empty state', async () => {
          const emptyPrompt = page.testSubj.locator('exceptionsEmptyPrompt');
          await expect(emptyPrompt).toBeVisible({ timeout: 10_000 });
        });

        await test.step('Add exception from empty prompt', async () => {
          const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
          await addExceptionBtn.click();

          const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
          await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

          await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is one of', 'foo');

          const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
          await itemNameInput.fill('My item name');

          const addToRuleRadio = page.testSubj.locator('addToRuleRadio');
          if (await addToRuleRadio.isVisible()) {
            await addToRuleRadio.click();
          }

          const bulkCloseCheckbox = page.testSubj.locator('bulkCloseAlertOnAddExceptionCheckbox');
          if (await bulkCloseCheckbox.isVisible()) {
            await bulkCloseCheckbox.check();
          }

          await pageObjects.exceptions.submitException();
        });

        await test.step('Verify exception item displayed', async () => {
          const exceptionItems = page.testSubj.locator('exceptionItemCard');
          await expect(exceptionItems).toHaveCount(1);
        });
      });
    });
  }
);
