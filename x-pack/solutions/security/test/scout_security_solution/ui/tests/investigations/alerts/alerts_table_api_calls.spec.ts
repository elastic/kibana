/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe('Alert Table API calls', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices);
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should call api/lists/index only once', async ({ page }) => {
    let callCount = 0;

    await page.route('**/api/lists/index', (route) => {
      callCount += 1;
      return route.continue();
    });

    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });

    await page.testSubj
      .locator('alertsTableIsLoaded')
      .waitFor({ state: 'visible', timeout: 30_000 });

    expect(callCount).toBe(1);
  });
});
