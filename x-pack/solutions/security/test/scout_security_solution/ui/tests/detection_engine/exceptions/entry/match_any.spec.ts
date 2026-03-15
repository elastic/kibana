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
  'Exception match any',
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

    test('Creates exception item with match_any entry and verifies alerts are generated', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          index: ['auditbeat-exceptions-*'],
          enabled: false,
          query: '*',
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'rule_exceptions');

      await test.step('Open exception flyout and add match_any entry', async () => {
        const addExceptionBtn = page.testSubj.locator('exceptionsEmptyPromptButton');
        await addExceptionBtn.click();

        const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
        await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

        const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
        await itemNameInput.fill('My item name');

        await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is not one of', 'foo');

        const confirmBtn = page.testSubj.locator('addExceptionConfirmButton');
        await expect(confirmBtn).toBeEnabled();
        await confirmBtn.click();
      });

      await test.step('Enable rule and check for alerts', async () => {
        await pageObjects.ruleDetails.clickEnableRuleSwitch();
        await pageObjects.ruleDetails.goToAlertsTab();

        const alertsCount = page.testSubj.locator('alertsCount');
        await expect(alertsCount).toBeVisible({ timeout: 60_000 });
      });
    });
  }
);
