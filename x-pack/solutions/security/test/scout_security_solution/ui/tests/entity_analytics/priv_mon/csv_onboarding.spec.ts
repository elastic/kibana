/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

test.describe('Privileged User Monitoring - CSV onboarding', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded('linux_process');
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ esArchiver }) => {
    try {
      // no-op: Scout EsArchiverFixture does not support unload;
    } catch {
      // Best-effort cleanup
    }
  });

  test('uploads a valid CSV file', async ({ page, pageObjects }) => {
    await pageObjects.entityAnalyticsPrivMon.navigate();
    await page.getByTestId('privilegedUserMonitoringImportCSVCard').first().click();
    await page
      .getByTestId('privileged-user-monitoring-file-picker')
      .first()
      .setInputFiles({
        name: 'valid_file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('tet1,testLabel'),
      });
    await page.getByTestId('privileged-user-monitoring-assign-button').first().click();

    await expect(pageObjects.entityAnalyticsPrivMon.onboardingCallout.first()).toContainText(
      'Privileged user monitoring set up: 1 user added'
    );
  });

  test('it validates an invalid CSV file', async ({ page, pageObjects }) => {
    await pageObjects.entityAnalyticsPrivMon.navigate();
    await page.getByTestId('privilegedUserMonitoringImportCSVCard').first().click();
    await page
      .getByTestId('privileged-user-monitoring-file-picker')
      .first()
      .setInputFiles({
        name: 'invalid_file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('invalid,line,format'),
      });

    await expect(pageObjects.entityAnalyticsPrivMon.validationStep.first()).toContainText(
      "1 row is invalid and won't be added"
    );
  });
});
