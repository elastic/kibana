/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: This suite runs sequentially (not alongside `parallel_tests/`) because it
 * toggles the `observability.sigeventsOverviewEnabled` feature flag, which is
 * server-wide. Placing it in `parallel_tests/` would cause the flag change to
 * spill into other parallel workers.
 *
 * Tests run in order: first with flag enabled, then with flag disabled.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const SIGEVENTS_FEATURE_FLAG = 'observability.sigeventsOverviewEnabled';

test.describe(
  'Sigevents Overview Page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: false,
        },
      });
    });

    test('shows sigevents overview with inline conversation when flag is enabled', async ({
      page,
      kbnUrl,
      apiServices,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: true,
        },
      });

      await page.goto(kbnUrl.get('/app/observability/overview'));

      await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible();
      await expect(page.getByTestId('sigeventsOverview')).toBeVisible();
      await expect(page.getByTestId('obltSigeventsConversation')).toBeVisible();
      await expect(page.getByTestId('agentBuilderEmbeddableConversation')).toBeVisible();
    });

    test('landing page redirects to sigevents when flag is enabled', async ({
      page,
      kbnUrl,
      apiServices,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: true,
        },
      });

      await page.goto(kbnUrl.get('/app/observability/landing'));

      await expect(page).toHaveURL(/\/app\/observability\/overview/);
      await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible();
    });

    test('shows default overview when flag is disabled', async ({ page, kbnUrl, apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: false,
        },
      });

      await page.goto(kbnUrl.get('/app/observability/overview'));

      await expect(page.getByTestId('obltOverviewPageHeader')).toBeVisible();
    });
  }
);
