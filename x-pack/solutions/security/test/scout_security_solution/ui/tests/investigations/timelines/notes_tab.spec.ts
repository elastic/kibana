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
  getDefaultTimeline,
} from '../../../common/timeline_api_helpers';
import { TIMELINES_URL } from '../../../common/urls';

const mockTimeline = {
  ...getDefaultTimeline(),
  query: 'query_to_intentionally_find_nothing: *',
  notes: 'Yes, the best timeline',
};

test.describe(
  'Timeline notes tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page }) => {
      await deleteTimelines(kbnClient);
      const { savedObjectId } = await createTimeline(kbnClient, mockTimeline);
      await browserAuth.loginAsAdmin();
      await page.goto(`${TIMELINES_URL}/${savedObjectId}`);
      await page.testSubj
        .locator('timelineTabs-notes')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
    });

    test('renders notes UI and basic content and delete it', async ({ page }) => {
      await page.getByTestId('timelineTabs-notes').first().click();
      const notesArea = page.getByTestId('euiMarkdownEditorTextArea');
      await notesArea.first().fill(mockTimeline.notes);
      await page.getByTestId('securitySolutionNotesAddNotesButton').first().click();

      await expect(notesArea.first()).toBeVisible();
      await expect(page.locator('.euiMarkdownFormat').first()).toHaveText(mockTimeline.notes);

      await page.getByTestId('securitySolutionNotesDeleteNotesButton-0').first().click();
      await page.getByTestId('confirmModalConfirmButton').first().click();

      const noteDescriptions = page.getByTestId('securitySolutionNotesTimelineDescriptionComment');
      await expect(noteDescriptions.count()).toBeLessThan(2);
    });
  }
);
