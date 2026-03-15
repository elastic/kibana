/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { ALERTS_URL } from '../../../common/urls';

test.describe(
  'Timeline filters',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('filter in from timeline cell action', async ({ page, pageObjects }) => {
      const { timeline } = pageObjects;
      const timerangeUrl =
        ALERTS_URL +
        '?timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)))';

      await page.goto(timerangeUrl);
      await timeline.openTimelineUsingToggle();

      await test.step('Create new timeline and populate with data', async () => {
        await timeline.addNameToTimelineAndSave('Filter test timeline');
        await timeline.executeTimelineKQL('*');
      });

      await test.step('Hover over a cell and click filter in', async () => {
        const eventCategoryCell = page
          .locator('[data-gridcell-column-id="event.category"] .euiDataGridRowCell__content')
          .first();
        await eventCategoryCell.hover();

        const filterForBtn = page.testSubj.locator('dataGridColumnCellAction-security_filter_in');
        await filterForBtn.click();
      });

      await test.step('Verify filter badge appears', async () => {
        const filterBadge = page.testSubj.locator('filter-badge-filterContent');
        await expect(filterBadge).toBeVisible();
      });
    });

    test('filter out from timeline cell action', async ({ page, pageObjects }) => {
      const { timeline } = pageObjects;
      const timerangeUrl =
        ALERTS_URL +
        '?timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)))';

      await page.goto(timerangeUrl);
      await timeline.openTimelineUsingToggle();

      await test.step('Create new timeline and populate with data', async () => {
        await timeline.addNameToTimelineAndSave('Filter out test timeline');
        await timeline.executeTimelineKQL('*');
      });

      await test.step('Hover over a cell and click filter out', async () => {
        const eventCategoryCell = page
          .locator('[data-gridcell-column-id="event.category"] .euiDataGridRowCell__content')
          .first();
        await eventCategoryCell.hover();

        const filterOutBtn = page.testSubj.locator('dataGridColumnCellAction-security_filter_out');
        await filterOutBtn.click();
      });

      await test.step('Verify events are filtered out', async () => {
        const timelineEvents = page.testSubj.locator('discoverDocTable');
        await expect(timelineEvents).toBeVisible();
      });
    });
  }
);
