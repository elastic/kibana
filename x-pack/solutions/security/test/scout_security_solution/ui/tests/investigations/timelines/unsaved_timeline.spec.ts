/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteTimelines } from '../../../common/timeline_api_helpers';
import { TIMELINES_URL } from '../../../common/urls';

test.describe(
  'Timelines - Unsaved states',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page, pageObjects }) => {
      await deleteTimelines(kbnClient);
      await browserAuth.loginAsAdmin();
      await page.goto(TIMELINES_URL);
      await pageObjects.timeline.openTimelineUsingToggle();
      await pageObjects.timeline.openNewTimeline();
    });

    test('should show different timeline states', async ({ page, pageObjects }) => {
      await expect(pageObjects.timeline.timelinePanel.first()).toBeVisible();
      const status = page.getByTestId('timeline-save-status');
      await expect(status.first()).toBeVisible();
      await expect(status.first()).toContainText('Unsaved');
      await pageObjects.timeline.addNameToTimelineAndSave('Test Timeline');
      await pageObjects.timeline.timelineStatus
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await pageObjects.timeline.executeTimelineKQL('agent.name : *');
      await expect(status.first()).toContainText('Unsaved changes');
    });
  }
);
