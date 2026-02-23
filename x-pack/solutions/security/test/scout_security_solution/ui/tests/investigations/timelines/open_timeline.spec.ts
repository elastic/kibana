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
  addNoteToTimeline,
  getDefaultTimeline,
} from '../../../common/timeline_api_helpers';
import { TIMELINES_URL } from '../../../common/urls';

const mockTimeline = getDefaultTimeline();

test.describe(
  'Open timeline modal',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page, pageObjects }) => {
      await deleteTimelines(kbnClient);
      const { savedObjectId } = await createTimeline(kbnClient, mockTimeline);
      await browserAuth.loginAsAdmin();
      await page.goto(TIMELINES_URL);
      await pageObjects.timeline.refreshTimelinesUntilPresent(savedObjectId);
      try {
        await addNoteToTimeline(kbnClient, 'Test note', savedObjectId);
      } catch {
        // best-effort
      }
      await pageObjects.timeline.openTimelineById(savedObjectId);
      await pageObjects.timeline.pinFirstEvent();
      await pageObjects.timeline.markAsFavorite();
    });

    test('should display timeline info in the open timeline modal', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.timeline.openTimelineFromSettings();
      await expect(pageObjects.timeline.openTimelineModal.first()).toBeVisible();
      await expect(page.getByText(mockTimeline.title).first()).toBeVisible();
      await expect(page.getByTestId('description').last()).toHaveText(mockTimeline.description);
      await expect(page.getByTestId('pinned-event-count').last()).toHaveText('1');
      await expect(page.getByTestId('notes-count').last()).toHaveText('1');
      await expect(page.getByTestId('favorite-starFilled-star').last()).toBeVisible();
      await expect(page.getByTestId('timeline-modal-header-title').first()).toHaveText(
        mockTimeline.title
      );
    });
  }
);
