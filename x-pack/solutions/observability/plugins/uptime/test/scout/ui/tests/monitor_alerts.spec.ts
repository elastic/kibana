/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const dateRangeStart = '2019-09-10T12:40:08.078Z';
const dateRangeEnd = '2019-09-11T19:40:08.078Z';
const monitorId = '0000-intermittent';
const alertId = 'uptime-anomaly-alert';
const alertThreshold = 'major';

test.describe('MonitorAlerts', { tag: tags.stateful.classic }, () => {
  test('creates and manages anomaly detection alert', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.monitorDetails.navigateToOverviewPage({ dateRangeEnd, dateRangeStart });
    await pageObjects.monitorDetails.navigateToMonitorDetails(monitorId);
    await pageObjects.monitorDetails.waitForLoadingToFinish();

    // Clean previous data if available
    await pageObjects.monitorDetails.disableAnomalyDetectionAlert().catch(() => {});
    await pageObjects.monitorDetails.disableAnomalyDetection().catch(() => {});

    // Open anomaly detection flyout
    await pageObjects.monitorDetails.waitAndRefresh(5000);
    await pageObjects.monitorDetails.enableAnomalyDetection();
    await pageObjects.monitorDetails.ensureAnomalyDetectionFlyoutIsOpen();

    // Verify can create job
    const canCreateJob = await pageObjects.monitorDetails.canCreateJob();
    const missingLicense = await page.testSubj
      .locator('uptimeMLLicenseInfo')
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(canCreateJob).toBeTruthy();
    expect(missingLicense).toBeFalsy();

    // Create ML job
    await page.testSubj.click('uptimeMLCreateJobBtn');
    await page.testSubj.locator('uptimeMLJobSuccessfullyCreated').waitFor({ timeout: 30000 });
    await page.testSubj.click('toastCloseButton');

    // Close anomaly detection flyout
    await page.testSubj.click('ruleFlyoutFooterCancelButton');

    // Open anomaly detection alert
    await pageObjects.monitorDetails.waitAndRefresh(3000);
    await pageObjects.monitorDetails.openAnomalyDetectionMenu();
    await page.testSubj.click('uptimeEnableAnomalyAlertBtn');

    // Update anomaly detection alert
    await pageObjects.monitorDetails.updateAlert({ id: alertId, threshold: alertThreshold });

    // Save anomaly detection alert
    await page.testSubj.click('ruleFlyoutFooterSaveButton');
    await page.testSubj.click('confirmModalConfirmButton');
    await page.locator(`text=Created rule "${alertId}"`).waitFor();

    // Disable anomaly detection alert and ML job
    await pageObjects.monitorDetails.waitAndRefresh(5000);
    await pageObjects.monitorDetails.disableAnomalyDetectionAlert();
    await page.waitForTimeout(1000);
    await pageObjects.monitorDetails.disableAnomalyDetection();
  });
});
