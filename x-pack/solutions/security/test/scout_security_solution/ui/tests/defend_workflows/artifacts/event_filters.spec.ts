/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { APP_EVENT_FILTERS_PATH } from '../../../../common/defend_workflows_urls';

test.describe(
  'Event Filters',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should display event filters page', async ({ page, pageObjects }) => {
      await pageObjects.artifacts.goto('eventFilters');
      await pageObjects.artifacts.waitForPage('eventFilters');
      await expect(page).toHaveURL(new RegExp(`.*${APP_EVENT_FILTERS_PATH}.*`));
      await expect(page.testSubj.locator('EventFiltersListPage').first()).toBeVisible();
    });
  }
);
