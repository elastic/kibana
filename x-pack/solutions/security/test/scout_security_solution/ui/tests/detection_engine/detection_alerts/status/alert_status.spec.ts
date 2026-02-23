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
import { SECURITY_ARCHIVES } from '../../../../common/es_helpers';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Alert status',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getNewRule({ rule_id: 'status-rule' }));
    });

    test.afterAll(async ({ esArchiver }) => {
      // no-op: Scout EsArchiverFixture does not support unload;
    });

    test('updates alert status (open/acknowledged/closed)', async ({ page, pageObjects }) => {
      const { detectionAlerts } = pageObjects;

      await page.goto(ALERTS_URL);
      await detectionAlerts.waitForAlertsToLoad();

      await test.step('Select alerts and close them', async () => {
        const alertCheckboxes = detectionAlerts.alertCheckbox;
        const count = await alertCheckboxes.count();
        test.skip(count < 1, 'No alerts available');
        await detectionAlerts.selectNumberOfAlerts(1);

        const closeBtn = page.testSubj.locator('alert-close-context-menu-item');
        await closeBtn.click();
      });

      await test.step('Verify success toast', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText('closed');
      });

      await test.step('Navigate to closed alerts and open one', async () => {
        await detectionAlerts.closedAlertsFilterBtn.click();
        await detectionAlerts.waitForAlertsToLoad();

        const alertCheckboxes = detectionAlerts.alertCheckbox;
        const count = await alertCheckboxes.count();
        test.skip(count < 1, 'No closed alerts available');
        await detectionAlerts.selectNumberOfAlerts(1);

        const openBtn = page.testSubj.locator('alert-open-context-menu-item');
        await openBtn.click();
      });

      await test.step('Verify alert was reopened', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText('open');
      });
    });
  }
);
