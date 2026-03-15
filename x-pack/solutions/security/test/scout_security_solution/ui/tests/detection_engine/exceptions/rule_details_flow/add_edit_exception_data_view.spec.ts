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
import { SECURITY_ARCHIVES, loadEsArchive, unloadEsArchive } from '../../../../common/es_helpers';

test.describe(
  'Add/edit exception with data view',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const DATAVIEW = 'auditbeat-exceptions-*';
    const ITEM_NAME = 'Sample Exception List Item';

    test.beforeEach(async ({ browserAuth, apiServices, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test.afterEach(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test('Creates exception item from rule using data view and closes matching alerts', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          query: 'agent.name:*',
          data_view_id: DATAVIEW,
          rule_id: `rule-${Date.now()}`,
          enabled: true,
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'alerts');

      await test.step('Wait for alerts', async () => {
        const alertsCount = page.testSubj.locator('alertsCount');
        await expect(alertsCount).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Go to exceptions tab and add exception', async () => {
        await pageObjects.ruleDetails.goToExceptionsTab();

        const emptyPrompt = page.testSubj.locator('exceptionsEmptyPrompt');
        await expect(emptyPrompt).toBeVisible({ timeout: 10_000 });

        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

        await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is one of', 'foo');

        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill(ITEM_NAME);

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

    test('Edits an exception item on a data view rule', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const NEW_ITEM_NAME = 'Exception item-EDITED';
      const ITEM_FIELD = 'unique_value.test';

      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          query: 'agent.name:*',
          data_view_id: DATAVIEW,
          rule_id: `rule-${Date.now()}`,
          enabled: true,
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Add initial exception', async () => {
        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

        await pageObjects.exceptions.fillExceptionEntry(ITEM_FIELD, 'is', 'foo');

        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill(ITEM_NAME);

        await pageObjects.exceptions.submitException();
      });

      await test.step('Edit exception item', async () => {
        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toHaveCount(1);

        const actionsBtn = page.testSubj.locator('exceptionItemCardActions').first();
        await actionsBtn.click();
        const editBtn = page.testSubj.locator('exceptionItemEditButton');
        await editBtn.click();

        const editFlyout = page.testSubj.locator('editExceptionFlyout');
        await expect(editFlyout).toBeVisible({ timeout: 10_000 });

        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.clear();
        await itemNameInput.fill(NEW_ITEM_NAME);

        const saveBtn = page.testSubj.locator('editExceptionConfirmButton');
        await saveBtn.click();
      });

      await test.step('Verify updated exception', async () => {
        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toHaveCount(1);
        await expect(page.testSubj.locator('exceptionItemCardHeader')).toContainText(NEW_ITEM_NAME);
      });
    });
  }
);
