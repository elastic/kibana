/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const GLOBAL_SETTINGS_PATH = 'api/observability/slo_settings/global';
const API_VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };

test.describe(
  'SLO global settings',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'PUT',
        path: GLOBAL_SETTINGS_PATH,
        headers: API_VERSION_HEADER,
        body: { sliRetention: { enabled: false, periodDays: 365 } },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'PUT',
        path: GLOBAL_SETTINGS_PATH,
        headers: API_VERSION_HEADER,
        body: { sliRetention: { enabled: false, periodDays: 365 } },
      });
    });

    test('saves the SLI retention and shows it after a reload', async ({ page, pageObjects }) => {
      const { slo, toasts } = pageObjects;

      await test.step('open the Global tab', async () => {
        await slo.gotoSettings();
        await slo.openGlobalSettingsTab();
        await expect(slo.sliRetentionSwitch).toHaveAttribute('aria-checked', 'false');
      });

      await test.step('enable SLI retention for 400 days and confirm', async () => {
        await slo.enableSliRetention(400);
        await expect(slo.sliRetentionConfirmModal).toContainText('older than 400 days');
        await slo.confirmSliRetention();
        await toasts.waitForToastWithText('Global SLO settings saved');
      });

      await test.step('the saved value is shown after a reload', async () => {
        await page.reload();
        await slo.globalSettingsForm.waitFor({ state: 'visible' });
        await expect(page).toHaveURL(/\/settings\/global$/);
        await expect(slo.sliRetentionSwitch).toHaveAttribute('aria-checked', 'true');
        await expect(slo.sliRetentionPeriod).toHaveValue('400');
      });
    });
  }
);
