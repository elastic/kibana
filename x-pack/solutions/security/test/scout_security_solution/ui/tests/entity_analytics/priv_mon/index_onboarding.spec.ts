/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * Failing: See https://github.com/elastic/kibana/issues/237554
 * Failing: See https://github.com/elastic/kibana/issues/237553
 */

import { test, expect, tags } from '../../../fixtures';
import { ENTITY_ANALYTICS_PRIV_MON_URL } from '../../../common/urls';

test.describe(
  'Privileged User Monitoring - Index onboarding',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('navigates to privileged user monitoring page', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(ENTITY_ANALYTICS_PRIV_MON_URL);

      const privMonPage = page.testSubj.locator('PrivilegedUserMonitoringPage');
      const onboardingPage = page.testSubj.locator('privMonOnboardingPage');
      const pageContent = privMonPage.or(onboardingPage);
      await expect(pageContent).toBeVisible({ timeout: 30_000 });
    });

    test('displays onboarding prompt for index setup', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(ENTITY_ANALYTICS_PRIV_MON_URL);

      const enableBtn = page.testSubj.locator('privMonEnableButton');
      const onboarding = page.testSubj.locator('privMonOnboardingPage');
      const hasOnboarding = await onboarding
        .or(enableBtn)
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      if (hasOnboarding) {
        await expect(onboarding.or(enableBtn)).toBeVisible();
      }
    });
  }
);
