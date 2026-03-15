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
import { SECURITY_ARCHIVES, loadEsArchive, unloadEsArchive } from '../../../../common/es_helpers';

test.describe(
  'Add/edit endpoint exception from rule details',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const ITEM_NAME = 'Sample Exception List Item';

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
    });

    test.afterEach(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
    });

    test('Creates an endpoint exception item from rule details', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          query: 'event.code:*',
          index: ['auditbeat*'],
          rule_id: `rule-${Date.now()}`,
          enabled: false,
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'endpoint_exceptions');

      await test.step('Verify empty prompt exists', async () => {
        const emptyPrompt = page.testSubj.locator('exceptionsEmptyPrompt');
        await expect(emptyPrompt).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Open flyout and create endpoint exception', async () => {
        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

        const confirmBtn = page.testSubj.locator('addExceptionConfirmButton');
        await expect(confirmBtn).toBeDisabled();

        await pageObjects.exceptions.fillExceptionEntry('event.code', 'is', 'foo');

        await expect(confirmBtn).toBeDisabled();

        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill(ITEM_NAME);

        await confirmBtn.click();
      });

      await test.step('Verify exception item displayed', async () => {
        const exceptionItems = page.testSubj.locator('exceptionItemCard');
        await expect(exceptionItems).toHaveCount(1);
      });
    });
  }
);
