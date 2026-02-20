/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteTimelines, getDefaultTimeline } from '../../../common/timeline_api_helpers';
import { HOSTS_ALL_URL } from '../../../common/urls';

test.describe(
  'Timelines - Data view',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page, pageObjects }) => {
      await deleteTimelines(kbnClient);
      await browserAuth.loginAsAdmin();
      await page.goto(HOSTS_ALL_URL);
      await pageObjects.timeline.openTimelineUsingToggle();
      await pageObjects.timeline.createNewTimeline();
      await pageObjects.timeline.addNameAndDescriptionToTimeline(
        getDefaultTimeline().title,
        getDefaultTimeline().description
      );
    });
    test('should display timeline with default data view', async ({ pageObjects }) => {
      await expect(pageObjects.timeline.timelineQuery.first()).toBeVisible();
    });
  }
);
