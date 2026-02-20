/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  createTimelineTemplate,
  deleteTimelines,
  getDefaultTimeline,
} from '../../../common/timeline_api_helpers';
import { TIMELINE_TEMPLATES_URL, OVERVIEW_URL } from '../../../common/urls';

const mockTimeline = getDefaultTimeline();

test.describe(
  'Timelines - Creation',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient }) => {
      await deleteTimelines(kbnClient);
    });

    test('should create a timeline with crud privileges', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(OVERVIEW_URL);
      await pageObjects.timeline.openTimelineUsingToggle();
      await pageObjects.timeline.createNewTimeline();
      await pageObjects.timeline.addNameAndDescriptionToTimeline(
        mockTimeline.title,
        mockTimeline.description
      );
      await expect(pageObjects.timeline.timelinePanel.first()).toBeVisible();
    });
  }
);

test.describe(
  'Timelines - Create from template',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient }) => {
      await deleteTimelines(kbnClient);
    });

    test('should create a timeline from a template', async ({
      browserAuth,
      page,
      pageObjects,
      kbnClient,
    }) => {
      test.slow();
      await createTimelineTemplate(kbnClient, mockTimeline);
      await browserAuth.loginAsAdmin();
      await page.goto(TIMELINE_TEMPLATES_URL);

      const customTemplates = page.getByTestId('custom-templates');
      await customTemplates.waitFor({ state: 'visible', timeout: 15_000 });
      await customTemplates.click();

      const expandBtn = page.getByTestId('euiCollapsedItemActionsButton').first();
      if (await expandBtn.isVisible()) {
        await expandBtn.click();
      }

      const createFromTemplateBtn = page.getByTestId('create-from-template');
      await createFromTemplateBtn.first().click();

      await expect(pageObjects.timeline.timelineFlyoutWrapper.first()).toBeVisible();
      await expect(pageObjects.timeline.timelineQuery.first()).toContainText(mockTimeline.query);
    });
  }
);
