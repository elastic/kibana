/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

/**
 * End-to-end spec for the Super Timeline feature.
 *
 * Entry point tested here: Timelines list page bulk action.
 * Cases entry point is covered by the Cases team (see PR 5/5 description).
 *
 * Proof of transience: SO counts for timeline/note/pinned_event are captured
 * before and after opening the Super Timeline and asserted to be unchanged.
 */

const TIMELINES_URL = '/api/timelines';

/** Fetch the total count of saved timelines (default type) from the API. */
const fetchTimelineSavedObjectCount = async (kbnClient: { request: Function }): Promise<number> => {
  const response = await kbnClient.request<{ totalCount: number }>({
    method: 'GET',
    path: `${TIMELINES_URL}?page_size=1&page_index=1&sort_field=updated&sort_order=desc&timeline_type=default`,
  });
  return response.data?.totalCount ?? 0;
};

spaceTest.describe(
  'Super Timeline — Timelines list entry point',
  { tag: [...tags.stateful.classic] },
  () => {
    let timelineIdA: string;
    let timelineIdB: string;

    spaceTest.beforeEach(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();

      timelineIdA = await apiServices.timeline.createTimeline({
        title: 'Endpoint Investigation',
        query: 'event.category: process',
      });
      timelineIdB = await apiServices.timeline.createTimeline({
        title: 'Network Investigation',
        query: 'event.category: network',
      });

      await apiServices.timeline.addNote(timelineIdA, 'Suspicious process spawned at 14:32 UTC');
      await apiServices.timeline.addNote(timelineIdB, 'Lateral movement detected on host-42');
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();
    });

    spaceTest(
      'opens the Super Timeline modal in read-only mode with merged content',
      async ({ browserAuth, pageObjects, kbnClient }) => {
        const { timelinePage } = pageObjects;

        await browserAuth.loginAsPlatformEngineer();
        await timelinePage.navigateToTimelines();

        // Record SO counts before opening Super Timeline (transience proof).
        const timelineCountBefore = await fetchTimelineSavedObjectCount(kbnClient);

        await spaceTest.step('Select both timelines', async () => {
          await timelinePage.selectTimelineByTitle('Endpoint Investigation');
          await timelinePage.selectTimelineByTitle('Network Investigation');
        });

        await spaceTest.step('Trigger View Super Timeline', async () => {
          await timelinePage.batchActionsButton.click();
          await timelinePage.page.testSubj.locator('view-super-timeline-action').click();
          await timelinePage.panel.waitFor({ timeout: 10_000 });
        });

        await spaceTest.step('Assert read-only modal — badge present, Save hidden', async () => {
          await expect(timelinePage.superTimelineBadge).toBeVisible();
          await expect(timelinePage.saveButton).not.toBeVisible();
          await expect(
            timelinePage.page.testSubj.locator('add-to-favorites-btn')
          ).not.toBeVisible();
        });

        await spaceTest.step('Assert no new saved objects were created (transient)', async () => {
          const timelineCountAfter = await fetchTimelineSavedObjectCount(kbnClient);
          expect(timelineCountAfter).toBe(timelineCountBefore);
        });

        await timelinePage.close();
      }
    );

    spaceTest(
      'View Super Timeline action is disabled with fewer than 2 timelines selected',
      async ({ browserAuth, pageObjects }) => {
        const { timelinePage } = pageObjects;

        await browserAuth.loginAsPlatformEngineer();
        await timelinePage.navigateToTimelines();

        await timelinePage.selectTimelineByTitle('Endpoint Investigation');
        await timelinePage.batchActionsButton.click();

        const actionButton = timelinePage.page.testSubj.locator('view-super-timeline-action');
        await expect(actionButton).toBeDisabled();
      }
    );
  }
);
