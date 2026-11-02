/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE } from '@kbn/management-settings-ids';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { mockNightshiftSetUp, test } from '../fixtures';

const NIGHTSHIFT_PAGE_LOAD_TIMEOUT = 60_000;

test.describe(
  'Nightshift navigation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, config }) => {
      // Significant events discovery is gated behind the nightshift.enabled feature
      // flag (defaults to false). The /internal/core/_settings route used to force it on is only
      // registered when coreApp.allowDynamicConfigOverrides=true (Scout's local base configs);
      // ECH/MKI deployments don't carry that override, so the PUT 404s — skip there.
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip(
        config.isCloud === true,
        `Cannot override '${NIGHTSHIFT_ENABLED_FLAG}' on Cloud deployments`
      );
      // skip() in beforeAll only skips the tests, not the hook body, so guard the requests too.
      if (config.isCloud) {
        return;
      }

      await apiServices.core.settings({
        'feature_flags.overrides': {
          [NIGHTSHIFT_ENABLED_FLAG]: true,
        },
      });
    });

    test.beforeEach(async ({ browserAuth, kbnClient, page }) => {
      await mockNightshiftSetUp(page);
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE]: false,
      });
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices, config, kbnClient }) => {
      if (config.isCloud) {
        return;
      }
      await kbnClient.uiSettings.unset(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE);
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [NIGHTSHIFT_ENABLED_FLAG]: null,
        },
      });
    });

    test('links to Settings', async ({ page, pageObjects }) => {
      await page.gotoApp('nightshift');
      await expect(page.getByTestId('nightshiftPage')).toBeVisible({
        timeout: NIGHTSHIFT_PAGE_LOAD_TIMEOUT,
      });
      await expect(page.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toHaveCount(1);
      await expect(page.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveText('Nightshift');

      await pageObjects.appMenu.clickItem('nightshiftSettingsLink');
      await expect(page).toHaveURL(/\/app\/nightshift\/settings\/(general|detections)/);
      await expect(page.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveText('Settings');

      await page.getByTestId('nightshiftSettingsTab-investigations').click();
      await expect(page).toHaveURL(/\/app\/nightshift\/settings\/investigations/);
      await expect(page.getByTestId('nightshiftRunLimitEnabledSwitch-investigation')).toBeVisible();
    });

    test('opens Detections on Events and hides Signals outside developer mode', async ({
      page,
    }) => {
      await page.gotoApp('nightshift/detections');
      await expect(page).toHaveURL(/\/app\/nightshift\/detections\/events/, {
        timeout: NIGHTSHIFT_PAGE_LOAD_TIMEOUT,
      });
      await expect(page.getByTestId('nightshiftDetectionPage')).toBeVisible();
      await expect(page.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveText('Detections');
      await expect(page.getByTestId('nightshiftDetectionOverview')).toBeVisible();
      await expect(page.getByTestId('nightshiftDetectionTab-events')).toBeVisible();
      await expect(page.getByTestId('nightshiftDetectionTab-rules')).toBeVisible();
      await expect(page.getByTestId('nightshiftDetectionTab-signals')).toHaveCount(0);
    });
  }
);
