/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { createTimelineTemplate, deleteTimelines, getDefaultTimeline } from '../../../common/timeline_api_helpers';
import { TIMELINE_TEMPLATES_URL } from '../../../common/urls';

test.describe(
  'Timeline templates - Export',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page }) => {
      await deleteTimelines(kbnClient);
      await createTimelineTemplate(kbnClient, getDefaultTimeline());
      await browserAuth.loginAsAdmin();
      await page.goto(TIMELINE_TEMPLATES_URL);
    });
    test('should export timeline template', async ({ page }) => {
      await page.getByTestId('custom-templates').first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.getByTestId('custom-templates').first().click();
      const actionBtn = page.locator('[id$="-actions"]').first();
      if (await actionBtn.isVisible()) {
        await actionBtn.click();
        await page.getByTestId('export-timeline').first().click();
        await expect(page.getByRole('status')).toBeVisible({ timeout: 5000 });
      }
    });
  }
);
