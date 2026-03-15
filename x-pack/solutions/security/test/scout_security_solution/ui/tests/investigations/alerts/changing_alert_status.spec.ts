/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { ALERTS_URL } from '../../../common/urls';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';

test.describe('Changing alert status', { tag: tags.deploymentAgnostic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
  });

  test.afterAll(async ({ esArchiver }) => {
    // no-op: Scout EsArchiverFixture does not support unload;
  });

  test('should close and reopen alerts', async ({
    browserAuth,
    page,
    apiServices,
    pageObjects,
  }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });

    const { detectionAlerts } = pageObjects;
    const alertsCount = detectionAlerts.alertsCount;

    await test.step('Select and close 3 alerts', async () => {
      await detectionAlerts.selectNumberOfAlerts(3);
      const selectedText = detectionAlerts.selectedAlertsButton;
      await expect(selectedText).toContainText('Selected 3 alert');

      await detectionAlerts.clickTakeActionPopover();
      await detectionAlerts.closeSelectedAlertsBtn.click();
      await page.locator('.euiToast').waitFor({ state: 'visible', timeout: 30_000 });
      await page.testSubj
        .locator('events-container-loading-false')
        .waitFor({ state: 'visible', timeout: 60_000 });
    });

    await test.step('Navigate to closed alerts and verify', async () => {
      await detectionAlerts.closedAlertsFilterBtn.click();
      await page.testSubj
        .locator('events-container-loading-false')
        .waitFor({ state: 'visible', timeout: 60_000 });
      await expect(alertsCount).toContainText('3');
    });

    await test.step('Reopen 1 alert from closed', async () => {
      await detectionAlerts.selectNumberOfAlerts(1);
      await detectionAlerts.clickTakeActionPopover();
      await detectionAlerts.openedAlertsFilterBtn.click();
      await page.testSubj
        .locator('events-container-loading-false')
        .waitFor({ state: 'visible', timeout: 60_000 });
    });
  });

  test('should mark alert as acknowledged', async ({
    browserAuth,
    page,
    apiServices,
    pageObjects,
  }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });

    const { detectionAlerts } = pageObjects;

    await test.step('Select alerts and mark first as acknowledged', async () => {
      await detectionAlerts.selectNumberOfAlerts(3);
      await expect(detectionAlerts.selectedAlertsButton).toContainText('Selected 3 alert');

      const firstCheckbox = page.testSubj
        .locator('bulk-actions-row-cell')
        .locator('.euiCheckbox__input')
        .nth(0);
      await firstCheckbox.click({ button: 'right' });
      await page.testSubj.locator('acknowledged-alert-status').click();

      await page.testSubj
        .locator('events-container-loading-false')
        .waitFor({ state: 'visible', timeout: 60_000 });
    });

    await test.step('Navigate to acknowledged tab and verify', async () => {
      await detectionAlerts.acknowledgedAlertsFilterBtn.click();
      await page.testSubj
        .locator('events-container-loading-false')
        .waitFor({ state: 'visible', timeout: 60_000 });

      await expect(detectionAlerts.alertsCount).toContainText('1');
    });
  });
});
