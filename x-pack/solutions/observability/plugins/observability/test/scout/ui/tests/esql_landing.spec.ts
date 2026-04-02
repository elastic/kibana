/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: This suite runs sequentially (not alongside `parallel_tests/`) because it
 * toggles the `discover.isEsqlDefault` feature flag, which is server-wide. Placing
 * it in `parallel_tests/` would cause the flag change to spill into the other parallel
 * workers running `landing.spec.ts` and break their assertions that assume the flag is
 * off by default.
 *
 * TODO: Once `discover.isEsqlDefault` is enabled by default and the feature flag is
 * removed, merge these tests into the existing parallel suite at:
 *   parallel_tests/landing.spec.ts
 * and update the classic-mode redirect assertion there to expect an ES|QL Discover URL.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { generateLogsData, TEST_START_DATE, TEST_END_DATE } from '../fixtures/generators';
import { BIGGER_TIMEOUT } from '../fixtures/constants';

test.describe(
  'Observability Landing Page (discover.isEsqlDefault enabled)',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'discover.isEsqlDefault': 'true',
        },
      });
    });

    test.beforeEach(async ({ browserAuth, logsSynthtraceEsClient }) => {
      await browserAuth.loginAsAdmin();
      await logsSynthtraceEsClient.clean();
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'discover.isEsqlDefault': 'false',
        },
      });
    });

    test('redirects to Discover with an ES|QL query when logs data exists', async ({
      page,
      pageObjects,
      logsSynthtraceEsClient,
    }) => {
      await generateLogsData({
        from: new Date(TEST_START_DATE).getTime(),
        to: new Date(TEST_END_DATE).getTime(),
        client: logsSynthtraceEsClient,
      });

      await pageObjects.observabilityNavigation.gotoLanding();

      await expect(page).toHaveURL(/\/app\/discover/, { timeout: BIGGER_TIMEOUT });
      // Confirm the Discover URL encodes an ES|QL data source (rison: `dataSource:(type:esql)`)
      // rather than a classic data-view source, which would encode `dataSource:(type:dataView,...)`
      await expect(page).toHaveURL(/type:esql/);
    });

    test('redirects to onboarding when no logs data exists', async ({ page, pageObjects }) => {
      await pageObjects.observabilityNavigation.gotoLanding();

      await expect(page).toHaveURL(/\/app\/observabilityOnboarding/, { timeout: BIGGER_TIMEOUT });
    });
  }
);
