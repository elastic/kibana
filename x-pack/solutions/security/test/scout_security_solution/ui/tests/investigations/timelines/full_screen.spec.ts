/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { HOSTS_ALL_URL } from '../../../common/urls';

test.describe(
  'Toggle full screen',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(HOSTS_ALL_URL);
      await pageObjects.timeline.openTimelineUsingToggle();
      const searchInput = page.locator('[data-test-subj="timelineQueryInput"]').first();
      await searchInput.fill('*');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    });

    test('should hide timeline header and tab list area', async ({ page }) => {
      const fullScreenBtn = page.getByTestId('full-screen-active').first();
      await fullScreenBtn.click();
      const header = page.getByTestId('timeline-hide-show-container');
      await expect(header.first()).not.toBeVisible();
    });
  }
);
