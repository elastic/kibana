/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  createTimeline,
  deleteTimelines,
  getDefaultTimeline,
} from '../../../common/timeline_api_helpers';
import { TIMELINES_URL } from '../../../common/urls';

const mockTimeline = getDefaultTimeline();

test.describe(
  'Timeline Templates - Creation',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient }) => {
      await deleteTimelines(kbnClient);
    });

    test('should create a timeline template from empty', async ({
      browserAuth,
      page,
      pageObjects,
      kbnClient,
    }) => {
      test.slow();
      await browserAuth.loginAsAdmin();
      await page.goto(TIMELINES_URL);

      const plusIcon = page.getByTestId('timeline-bottom-bar-open-button').first();
      await plusIcon.click();
      await page.waitForTimeout(500);
      const templateOption = page.getByTestId('timeline-bottom-bar-new-timeline-template').first();
      await templateOption.waitFor({ state: 'visible', timeout: 5000 });
      await templateOption.click();

      const searchInput = page.locator('[data-test-subj="timelineQueryInput"]').first();
      await searchInput.fill('host.name: *');
      await searchInput.press('Enter');

      await pageObjects.timeline.saveTimelineBtn.first().click();
      await pageObjects.timeline.timelineTitleInput.first().fill(mockTimeline.title);
      await pageObjects.timeline.timelineDescriptionInput.first().fill(mockTimeline.description);
      await pageObjects.timeline.saveTimelineModalSaveBtn.first().click();

      await expect(pageObjects.timeline.timelinePanel.first()).toBeVisible();
    });

    test('should create a template from an existing timeline', async ({
      browserAuth,
      page,
      pageObjects,
      kbnClient,
    }) => {
      test.slow();
      const created = await createTimeline(kbnClient, mockTimeline);
      await browserAuth.loginAsAdmin();
      await page.goto(TIMELINES_URL);
      await pageObjects.timeline.timelinesTable.waitFor({ state: 'visible', timeout: 15_000 });

      const expandBtn = page.getByTestId('euiCollapsedItemActionsButton').first();
      await expandBtn.waitFor({ state: 'visible', timeout: 5000 });
      await expandBtn.click();

      const createTemplateBtn = page.getByTestId('timeline-modal-create-template-from-timeline');
      await createTemplateBtn.click();

      const savedName = 'Test Template';
      await pageObjects.timeline.saveTimelineBtn.first().click();
      await pageObjects.timeline.timelineTitleInput.first().fill(savedName);
      await pageObjects.timeline.saveTimelineModalSaveBtn.first().click();

      await expect(pageObjects.timeline.timelinePanel.first()).toBeVisible();
    });
  }
);
