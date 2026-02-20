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
  'Timeline data providers',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page, pageObjects }) => {
      await deleteTimelines(kbnClient);
      await browserAuth.loginAsAdmin();
      await page.goto(HOSTS_ALL_URL);
      await page.waitForLoadState('networkidle');
      await pageObjects.timeline.createTimelineFromBottomBar();
      await pageObjects.timeline.addNameAndDescriptionToTimeline(
        getDefaultTimeline().title,
        getDefaultTimeline().description
      );
      await pageObjects.timeline.executeTimelineKQL('host.name: *');
    });
    test('should display data provider toggle', async ({ pageObjects }) => {
      await expect(pageObjects.timeline.toggleDataProviderBtn.first()).toBeVisible();
    });
  }
);
