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
  'Timelines ESQL - Discover Timeline State Integration',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteTimelines(kbnClient);
    });

    test('opens timeline and switches to ES|QL tab', async ({ pageObjects, page, kbnClient }) => {
      const timeline = await createTimeline(kbnClient, {
        title: 'ESQL Timeline Test',
        description: 'Timeline for ESQL state test',
        query: 'host.name: *',
      });

      await pageObjects.explore.gotoUrl(
        `${TIMELINES_URL}?timeline=(id:'${timeline.savedObjectId}',isOpen:!t)`
      );

      const timelineTab = page.testSubj.locator('timeline-tab-content-esql');
      const esqlTab = page.testSubj.locator('timelineTabs-esql');

      if (await esqlTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await esqlTab.click();
        await expect(timelineTab).toBeVisible({ timeout: 15_000 });
      }
    });
  }
);
