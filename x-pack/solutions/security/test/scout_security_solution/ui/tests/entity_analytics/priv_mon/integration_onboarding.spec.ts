/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { ENTITY_ANALYTICS_PRIV_MON_URL } from '../../../common/urls';

test.describe(
  'Privileged User Monitoring - Integrations onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('navigates to privileged user monitoring and shows onboarding', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.explore.gotoUrl(ENTITY_ANALYTICS_PRIV_MON_URL);

      const privMonPage = page.testSubj.locator('PrivilegedUserMonitoringPage');
      const onboardingPage = page.testSubj.locator('privMonOnboardingPage');
      const pageContent = privMonPage.or(onboardingPage);
      await expect(pageContent).toBeVisible({ timeout: 30_000 });
    });
  }
);
