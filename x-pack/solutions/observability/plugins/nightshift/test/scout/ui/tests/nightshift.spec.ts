/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { APP_HEADER_TEST_SUBJECTS, getAppMenuItemTestSubj } from '@kbn/app-header';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import { test } from '../fixtures';

test.describe(
  'Nightshift navigation from Significant Events Discovery',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, config }) => {
      // Significant events discovery is gated behind the streams.significantEventsAvailable feature
      // flag (defaults to false). The /internal/core/_settings route used to force it on is only
      // registered when coreApp.allowDynamicConfigOverrides=true (Scout's local base configs);
      // ECH/MKI deployments don't carry that override, so the PUT 404s — skip there.
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip(
        config.isCloud === true,
        `Cannot override '${STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG}' on Cloud deployments`
      );
      // skip() in beforeAll only skips the tests, not the hook body, so guard the requests too.
      if (config.isCloud) {
        return;
      }

      await apiServices.core.settings({
        'feature_flags.overrides': {
          [STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG]: true,
        },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices, config }) => {
      if (config.isCloud) {
        return;
      }
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG]: false,
        },
      });
    });

    test('navigates between Significant Events, Nightshift, and settings', async ({ page }) => {
      await page.gotoApp('significant_events/streams');

      const nightshiftButton = page.testSubj.locator(getAppMenuItemTestSubj('nightshift'));
      await expect(nightshiftButton).toBeVisible({ timeout: 60_000 });
      await nightshiftButton.click();

      await expect(page).toHaveURL(/\/app\/nightshift/, { timeout: 60_000 });
      await expect(page.testSubj.locator('nightshiftPage')).toBeVisible({ timeout: 60_000 });

      await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.root)).toHaveCount(1);
      await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title)).toHaveText('Nightshift');

      // Single settings action stays inline at Scout's default viewport — click it directly
      // (no overflow branch; expect() auto-waits for mount).
      const settingsLink = page.testSubj.locator('nightshiftSettingsLink');
      await expect(settingsLink).toBeVisible();
      await settingsLink.click();
      await expect(page).toHaveURL(/\/app\/significant_events\/settings/);
    });
  }
);
