/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { HOSTS_ALL_URL } from '../../../common/urls';

const hostExistsQuery = 'host.name: *';

test.describe(
  'Timeline - Inspect',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(HOSTS_ALL_URL);
      await pageObjects.timeline.openTimelineUsingToggle();
      const searchContainer = page
        .locator('[data-test-subj="timeline-select-search-or-filter"] textarea')
        .first();
      await searchContainer.fill(hostExistsQuery);
      await searchContainer.press('Enter');
      await page.waitForTimeout(2000);
    });

    test('should open inspect modal', async ({ page, pageObjects }) => {
      const inspectBtn = page
        .locator('[data-test-subj="timeline-container"] [data-test-subj="inspect-empty-button"]')
        .first();
      await inspectBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await inspectBtn.click();
      await expect(page.getByTestId('inspector-panel').first()).toBeVisible();
    });
  }
);
