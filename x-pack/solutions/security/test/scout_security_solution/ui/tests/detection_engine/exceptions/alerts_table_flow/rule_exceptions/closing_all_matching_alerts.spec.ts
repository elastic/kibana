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
  SECURITY_ARCHIVES,
  loadEsArchive,
  unloadEsArchive,
} from '../../../../../common/es_helpers';

test.describe(
  'Closing all matching alerts when adding exception',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const ITEM_NAME = 'Sample Exception Item';

    test.beforeEach(async ({ browserAuth, apiServices, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test.afterEach(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.EXCEPTIONS);
    });

    test('Creates exception from alert with bulk close option', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const created = await createRuleFromParams(kbnClient, {
        ...getNewRule({
          query: 'agent.name:*',
          index: ['auditbeat-exceptions-*'],
          interval: '1m',
          rule_id: 'rule_testing',
        }),
      });

      await pageObjects.ruleDetails.goto(created.id, 'alerts');

      await test.step('Wait for alerts to populate', async () => {
        const alertsCount = page.testSubj.locator('alertsCount');
        await expect(alertsCount).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Add exception from first alert with bulk close', async () => {
        const firstAlertActions = page.testSubj.locator('expand-event').first();
        await firstAlertActions.click();

        const addExceptionBtn = page.testSubj.locator('addRuleExceptionButton');
        if (await addExceptionBtn.isVisible({ timeout: 5_000 })) {
          await addExceptionBtn.click();

          const exceptionFlyout = page.testSubj.locator('addExceptionFlyout');
          await expect(exceptionFlyout).toBeVisible({ timeout: 10_000 });

          await pageObjects.exceptions.fillExceptionEntry('agent.name', 'is', 'foo');

          const itemNameInput = page.testSubj.locator('exceptionFlyoutNameInput');
          await itemNameInput.fill(ITEM_NAME);

          const bulkCloseCheckbox = page.testSubj.locator('bulkCloseAlertOnAddExceptionCheckbox');
          if (await bulkCloseCheckbox.isVisible()) {
            await bulkCloseCheckbox.check();
          }

          await page.testSubj.locator('addExceptionConfirmButton').click();
        }
      });

      await test.step('Verify closed alerts exist', async () => {
        const closedAlertsTab = page.testSubj.locator('closedAlerts');
        if (await closedAlertsTab.isVisible({ timeout: 5_000 })) {
          await closedAlertsTab.click();
          const alertsCount = page.testSubj.locator('alertsCount');
          await expect(alertsCount).toBeVisible({ timeout: 30_000 });
        }
      });
    });
  }
);
