/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Alerts index outdated callout',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('displays alerts page without outdated index callout under normal conditions', async ({
      page,
    }) => {
      await page.goto(ALERTS_URL);

      await test.step('Verify alerts page loads', async () => {
        const alertsPage = page.testSubj.locator('detectionsAlertsPage');
        await expect(alertsPage).toBeVisible();
      });

      await test.step('Verify no outdated callout under normal conditions', async () => {
        const outdatedCallout = page.testSubj.locator('alertsIndexOutdatedCallout');
        const isVisible = await outdatedCallout.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
      });
    });
  }
);
