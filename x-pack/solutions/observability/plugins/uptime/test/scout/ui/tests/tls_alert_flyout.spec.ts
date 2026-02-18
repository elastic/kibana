/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('TlsFlyoutInAlertingApp', { tag: tags.stateful.classic }, () => {
  test('opens TLS alert flyout and verifies setting values', async ({
    pageObjects,
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(
      kbnUrl.get('/app/management/insightsAndAlerting/triggersActions/rules')
    );

    await page.click('text=Create rule');
    await pageObjects.uptimeOverview.waitForLoadingToFinish();
    await page.testSubj.click('"xpack.uptime.alerts.tlsCertificate-SelectOption"');
    await pageObjects.uptimeOverview.waitForLoadingToFinish();
    await expect(page.locator('text=has a certificate expiring within')).toBeVisible();

    await expect(page.testSubj.locator('tlsExpirationThreshold')).toHaveText(
      'has a certificate expiring within days:  30'
    );
    await expect(page.testSubj.locator('tlsAgeExpirationThreshold')).toHaveText(
      'or older than days:  730'
    );
  });
});
