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
  'Exception use value list',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test.afterEach(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test('Creates exception item with value list reference', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          query: 'user.name:*',
          index: ['exceptions*'],
          exceptions_list: [],
          rule_id: `rule-${Date.now()}`,
          enabled: false,
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Open exception flyout from empty prompt', async () => {
        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Add exception item with value list operator', async () => {
        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill('Exception item with value list');

        await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is in list', '');

        const closeAlertsCheckbox = page.testSubj.locator('bulkCloseAlertOnAddExceptionCheckbox');
        if (await closeAlertsCheckbox.isVisible()) {
          await expect(closeAlertsCheckbox).toBeDisabled();
        }
      });
    });
  }
);
