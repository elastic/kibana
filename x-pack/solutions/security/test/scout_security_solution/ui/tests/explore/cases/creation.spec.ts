/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { CASES_URL, OVERVIEW_URL } from '../../../common/urls';
import {
  createTimeline,
  deleteTimelines,
  getDefaultTimeline,
} from '../../../common/timeline_api_helpers';

const testCase = {
  name: 'Scout case with timeline',
  tags: ['Tag1', 'Tag2'],
  description: 'Case description for Scout migration',
  timeline: {
    title: 'Scout timeline',
    query: 'host.name: *',
  },
};

test.describe(
  'Cases',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient, apiServices }) => {
      await deleteTimelines(kbnClient);
      await apiServices.cases?.deleteAll().catch(() => {});
      await browserAuth.loginAsAdmin();
    });

    test('Creates a new case with timeline and opens the timeline', async ({
      pageObjects,
      page,
      kbnClient,
    }) => {
      const timelineResp = await createTimeline(kbnClient, {
        ...getDefaultTimeline(),
        title: testCase.timeline.title,
        query: testCase.timeline.query,
      });
      const timelineId = timelineResp.savedObjectId;

      await pageObjects.explore.gotoUrl(CASES_URL);
      await page.testSubj.locator('createNewCaseBtn').first().click();
      await page.testSubj.locator('caseTitle').first().fill(testCase.name);
      await page.testSubj.locator('caseDescription').first().fill(testCase.description);
      for (const tag of testCase.tags) {
        await page.testSubj.locator('caseTags').first().fill(tag);
        await page.keyboard.press('Enter');
      }
      await page.testSubj.locator('timeline-link').first().click();
      const timelineOption = page.getByText(testCase.timeline.title).first();
      await timelineOption.click();
      await page.testSubj.locator('create-case-submit').first().click();
      await page.testSubj
        .locator('case-view-title')
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });

      await expect(page.testSubj.locator('case-view-title').first()).toHaveText(testCase.name);
      await expect(page.testSubj.locator('case-view-status').first()).toHaveText('Open');
      await page.testSubj.locator('case-timeline-action').first().click();
      await expect(page.testSubj.locator('timeline-title').first()).toContainText(
        testCase.timeline.title
      );

      await pageObjects.explore.gotoWithTimeRange(OVERVIEW_URL);
      await expect(page.testSubj.locator('overview-case-name').first()).toHaveText(testCase.name);
    });
  }
);
