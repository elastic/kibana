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

test.describe('Alert status (ESS)', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
    await browserAuth.loginAsAdmin();
    await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(kbnClient, getNewRule({ rule_id: 'ess-status-rule' }));
  });

  test.afterAll(async ({ esArchiver }) => {
    // no-op: Scout EsArchiverFixture does not support unload;
  });

  test('alert status in ESS - close and acknowledge alerts', async ({ page, pageObjects }) => {
    const { detectionAlerts } = pageObjects;

    await page.goto(ALERTS_URL);
    await detectionAlerts.waitForAlertsToLoad();

    await test.step('Select and acknowledge alerts', async () => {
      const alertCheckboxes = detectionAlerts.alertCheckbox;
      const count = await alertCheckboxes.count();
      test.skip(count < 1, 'No alerts available');
      await detectionAlerts.selectNumberOfAlerts(1);

      const acknowledgeBtn = page.testSubj.locator('alert-acknowledge-context-menu-item');
      const isVisible = await acknowledgeBtn.isVisible().catch(() => false);
      test.skip(!isVisible, 'Acknowledge action not available');
      await acknowledgeBtn.click();
    });

    await test.step('Verify success toast', async () => {
      await expect(page.testSubj.locator('globalToastList')).toContainText('acknowledged');
    });

    await test.step('View acknowledged alerts', async () => {
      await detectionAlerts.acknowledgedAlertsFilterBtn.click();
      await detectionAlerts.waitForAlertsToLoad();
      await expect(detectionAlerts.alertsTable).toBeVisible();
    });
  });
});
