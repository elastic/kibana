/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, setKibanaSetting } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { SECURITY_ARCHIVES, loadEsArchive, unloadEsArchive } from '../../../common/es_helpers';

test.describe(
  'Suppression window advanced setting',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.ALL_USERS);
    });

    test.afterEach(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.ALL_USERS);
    });

    test('Shows modal when closing suppressed alert with restartWindow setting', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      await setKibanaSetting(
        kbnClient,
        'securitySolution:suppressionBehaviorOnAlertClosure',
        'restartWindow'
      );

      const created = await createRuleFromParams(kbnClient, {
        ...getCustomQueryRuleParams({
          query: 'user.name:*',
          interval: '1m',
          rule_id: 'rule_testing',
        }),
        alert_suppression: {
          group_by: ['user.name'],
          duration: { value: 5, unit: 'h' },
        },
      });

      await pageObjects.ruleDetails.goto(created.id, 'alerts');

      const alertsTable = page.testSubj.locator('alertsTable');
      await expect(alertsTable).toBeVisible({ timeout: 60_000 });

      await test.step('Close alert triggers modal with restart message', async () => {
        const alertRow = page.testSubj.locator('expandableRowCell').first();
        await alertRow.click({ button: 'right' });

        const closeBtn = page.testSubj.locator('close-alert-status');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          const modal = page.testSubj.locator('alertCloseInfoModal');
          await expect(modal).toBeVisible({ timeout: 10_000 });
          await expect(modal).toContainText('Closing alert restarts alert suppression');
        }
      });
    });

    test('Shows modal when closing suppressed alert with continueWindow setting', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      await setKibanaSetting(
        kbnClient,
        'securitySolution:suppressionBehaviorOnAlertClosure',
        'continueWindow'
      );

      const created = await createRuleFromParams(kbnClient, {
        ...getCustomQueryRuleParams({
          query: 'user.name:*',
          interval: '1m',
          rule_id: 'rule_testing',
        }),
        alert_suppression: {
          group_by: ['user.name'],
          duration: { value: 5, unit: 'h' },
        },
      });

      await pageObjects.ruleDetails.goto(created.id, 'alerts');

      const alertsTable = page.testSubj.locator('alertsTable');
      await expect(alertsTable).toBeVisible({ timeout: 60_000 });

      await test.step('Close alert triggers modal with continue message', async () => {
        const alertRow = page.testSubj.locator('expandableRowCell').first();
        await alertRow.click({ button: 'right' });

        const closeBtn = page.testSubj.locator('close-alert-status');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          const modal = page.testSubj.locator('alertCloseInfoModal');
          await expect(modal).toBeVisible({ timeout: 10_000 });
          await expect(modal).toContainText("Closing alert doesn't interrupt alert suppression");
        }
      });
    });
  }
);
