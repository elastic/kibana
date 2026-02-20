/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { createRule, deleteAlertsAndRules } from '../../../common/api_helpers';
import { DETECTION_AND_RESPONSE_URL } from '../../../common/urls';

test.describe(
  'Detection response view',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, page }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, { name: `Rule ${Date.now()}` });
      await browserAuth.loginAsAdmin();
      await page.goto(DETECTION_AND_RESPONSE_URL);
      await page.waitForLoadState('networkidle');
    });

    test('should display detection response dashboard', async ({ page }) => {
      await expect(page).toHaveURL(/security\/detection_response/);
      const donutChart = page.getByTestId('alertsDonutChart');
      await expect(donutChart.first()).toBeVisible({ timeout: 15_000 });
    });
  }
);
