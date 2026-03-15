/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { HOSTS_ALL_URL } from '../../../common/urls';

test.describe(
  'Timeline flyout button',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test('toggles open the timeline', async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(HOSTS_ALL_URL);
      await pageObjects.timeline.openTimelineUsingToggle();
      const flyoutHeader = page.getByTestId('query-tab-flyout-header');
      await expect(flyoutHeader.first()).toBeVisible();
      await pageObjects.timeline.closeTimelineBtn.first().click();
      await expect(page.getByTestId('timelineTabs-query').first()).not.toBeVisible();
    });
  }
);
