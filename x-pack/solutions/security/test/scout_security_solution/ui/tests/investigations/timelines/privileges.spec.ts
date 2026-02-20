/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from "../../../fixtures";
import { deleteTimelines } from "../../../common/timeline_api_helpers";
import { TIMELINES_URL } from "../../../common/urls";

test.describe(
  "Timelines - Privileges",
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, page, pageObjects }) => {
      await deleteTimelines(kbnClient);
      await browserAuth.loginWithCustomRole("t1_analyst");
      await page.goto(TIMELINES_URL);
      await page.waitForLoadState("networkidle");
      await pageObjects.timeline.timelinesTable.first().waitFor({ state: "visible", timeout: 10_000 });
      await pageObjects.timeline.openTimelineUsingToggle();
      await pageObjects.timeline.createNewTimeline();
    });

    test("should not be able to create/update timeline with only read privileges", async ({
      page,
      pageObjects,
    }) => {
      await expect(pageObjects.timeline.timelinePanel.first()).toBeVisible();
      const saveBtn = pageObjects.timeline.saveTimelineBtn.first();
      await expect(saveBtn).toBeDisabled();
      await saveBtn.hover();
      const tooltip = page.getByTestId("timeline-modal-save-timeline-tooltip");
      await expect(tooltip.first()).toBeVisible();
      await expect(tooltip.first()).toContainText("permissions");
    });
  }
);
