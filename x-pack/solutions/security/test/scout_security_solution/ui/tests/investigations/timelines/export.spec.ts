/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { createTimeline, deleteTimelines, getDefaultTimeline } from '../../../common/timeline_api_helpers';
import { TIMELINES_URL } from '../../../common/urls';

test.describe(
  'Export timelines',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page }) => {
      await deleteTimelines(kbnClient);
      await createTimeline(kbnClient, getDefaultTimeline());
      await browserAuth.loginAsAdmin();
      await page.goto(TIMELINES_URL);
    });
    test('should display timelines for export', async ({ page, pageObjects }) => {
      await pageObjects.timeline.timelinesTable.first().waitFor({ state: 'visible', timeout: 10_000 });
      const rows = page.locator('[data-test-subj^="timeline-title-"]');
      await expect(rows.first()).toBeVisible({ timeout: 5000 });
    });
  }
);
