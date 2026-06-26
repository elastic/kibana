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
 * Proof of transience: SO counts for timelines are captured before and after
 * opening the Super Timeline and asserted to be unchanged.
 *
 * REQUIREMENT: Kibana must be started with:
 *   --xpack.securitySolution.enableExperimental=superTimeline
 * (The `superTimeline` flag defaults to false and cannot be overridden at runtime
 * via apiServices.core.settings — it is a startup config, not a feature-flag-service entry.)
 */

spaceTest.describe(
  'Super Timeline — Timelines list entry point',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeEach(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();

      await apiServices.timeline.createTimeline({
        title: 'Endpoint Investigation',
        query: 'event.category: process',
      });
      await apiServices.timeline.createTimeline({
        title: 'Network Investigation',
        query: 'event.category: network',
      });
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();
    });

    spaceTest(
      'opens the Super Timeline modal in read-only mode and does not create new saved objects',
      async ({ browserAuth, pageObjects, apiServices }) => {
        const { timelinePage } = pageObjects;

        await browserAuth.loginAsPlatformEngineer();
        await timelinePage.navigateToTimelines();

        // Record SO count before opening Super Timeline (transience proof).
        const timelineCountBefore = await apiServices.timeline.getCount();

        await spaceTest.step('Select both timelines', async () => {
          await timelinePage.selectTimelineByTitle('Endpoint Investigation');
          await timelinePage.selectTimelineByTitle('Network Investigation');
        });

        await spaceTest.step('Trigger View Super Timeline', async () => {
          await timelinePage.batchActionsButton.click();
          await timelinePage.viewSuperTimelineAction.click();
          await timelinePage.panel.waitFor({ timeout: 10_000 });
        });

        await spaceTest.step('Assert read-only modal — badge present, Save hidden', async () => {
          await expect(timelinePage.superTimelineBadge).toBeVisible();
          await expect(timelinePage.saveButton).not.toBeVisible();
          await expect(timelinePage.addToFavoritesButton).not.toBeVisible();
        });

        await spaceTest.step('Assert no new saved objects were created (transient)', async () => {
          const timelineCountAfter = await apiServices.timeline.getCount();
          expect(timelineCountAfter).toBe(timelineCountBefore);
        });

        await timelinePage.close();
      }
    );
  }
);
