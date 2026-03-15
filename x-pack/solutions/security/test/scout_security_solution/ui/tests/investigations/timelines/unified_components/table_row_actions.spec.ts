/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { createTimeline, deleteTimelines } from '../../../../common/timeline_api_helpers';
import { TIMELINES_URL } from '../../../../common/urls';

test.describe(
  'Timeline - Table row actions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteTimelines(kbnClient);
    });

    test('displays row actions in timeline events table', async ({
      pageObjects,
      page,
      kbnClient,
    }) => {
      const timeline = await createTimeline(kbnClient, {
        title: 'Row Actions Timeline',
        description: 'Timeline for row actions test',
        query: 'host.name: *',
      });

      await pageObjects.explore.gotoUrl(
        `${TIMELINES_URL}?timeline=(id:'${timeline.savedObjectId}',isOpen:!t)`
      );

      const queryTab = page.testSubj.locator('timelineTabs-query');
      await queryTab.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

      const timelineContent = page.testSubj.locator('timeline-tab-content-query');
      await expect(timelineContent).toBeVisible({ timeout: 20_000 });
    });
  }
);
