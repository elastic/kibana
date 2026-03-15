/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  deleteTimelines,
  createTimeline,
  getDefaultTimeline,
} from '../../../common/timeline_api_helpers';
import { TIMELINES_URL } from '../../../common/urls';

test.describe(
  'Timelines - URL state',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient }) => {
      await deleteTimelines(kbnClient);
    });

    test('should persist timeline in URL', async ({ browserAuth, page, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      const { savedObjectId } = await createTimeline(kbnClient, getDefaultTimeline());
      await page.goto(TIMELINES_URL + '/' + savedObjectId);
      await expect(page).toHaveURL(new RegExp('timelines'));
    });
  }
);
