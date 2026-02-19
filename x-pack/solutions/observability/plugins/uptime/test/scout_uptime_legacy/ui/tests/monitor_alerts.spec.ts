/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const dateRangeStart = '2019-09-10T12:40:08.078Z';
const dateRangeEnd = '2019-09-11T19:40:08.078Z';
const monitorId = '0000-intermittent';
const alertId = 'uptime-anomaly-alert';
const alertThreshold = 'major';

test.describe('MonitorAlerts', { tag: '@local-stateful-classic' }, () => {
  test.afterAll(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.monitorDetails.navigateToOverviewPage({ dateRangeEnd, dateRangeStart });
    await pageObjects.monitorDetails.navigateToMonitorDetails(monitorId);
    await pageObjects.monitorDetails.waitForLoadingToFinish();
    await pageObjects.monitorDetails.disableAnomalyDetectionAlert().catch(() => {});
    await pageObjects.monitorDetails.disableAnomalyDetection().catch(() => {});
  });

  test('creates and manages anomaly detection alert', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.monitorDetails.navigateToOverviewPage({ dateRangeEnd, dateRangeStart });
    await pageObjects.monitorDetails.navigateToMonitorDetails(monitorId);
    await pageObjects.monitorDetails.waitForLoadingToFinish();

    await test.step('clean previous anomaly data', async () => {
      await pageObjects.monitorDetails.disableAnomalyDetectionAlert().catch(() => {});
      await pageObjects.monitorDetails.disableAnomalyDetection().catch(() => {});
    });

    await test.step('open anomaly detection flyout and verify', async () => {
      await pageObjects.monitorDetails.refreshAndWaitForLoading();
      await pageObjects.monitorDetails.enableAnomalyDetection();
      await pageObjects.monitorDetails.ensureAnomalyDetectionFlyoutIsOpen();

      const canCreateJob = await pageObjects.monitorDetails.canCreateJob();
      const missingLicense = await page.testSubj
        .locator('uptimeMLLicenseInfo')
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      expect(canCreateJob).toBeTruthy();
      expect(missingLicense).toBeFalsy();
    });

    await test.step('create ML job', async () => {
      await pageObjects.monitorDetails.createMLJob();
      await pageObjects.monitorDetails.closeRuleFlyout();
    });

    await test.step('create anomaly detection alert', async () => {
      await pageObjects.monitorDetails.refreshAndWaitForLoading();
      await pageObjects.monitorDetails.clickEnableAnomalyAlert();
      await pageObjects.monitorDetails.updateAlert({ id: alertId, threshold: alertThreshold });
      await pageObjects.monitorDetails.saveRule();
      await expect(page.getByText(`Created rule "${alertId}"`)).toBeVisible({ timeout: 10_000 });
    });

    await test.step('disable anomaly alert and ML job', async () => {
      await pageObjects.monitorDetails.refreshAndWaitForLoading();
      await pageObjects.monitorDetails.disableAnomalyDetectionAlert();
      await pageObjects.monitorDetails.disableAnomalyDetection();
    });
  });
});
