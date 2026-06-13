/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

/**
 * Ported from the FTR `observability_functional` suite
 * (`apps/observability/exploratory_view.ts`).
 *
 * The original drove the integration end to end across four sequential `it`s
 * sharing one browser session: open the UX (RUM) app, click its "Explore data"
 * link, land on a prefilled Exploratory View, and break the series down by
 * `user_agent.name`. It runs here against the same RUM archives the suite's
 * global setup already ingests (`rum_8.0.0` + `rum_test_data`).
 *
 * Notes vs the FTR:
 *  - One Scout `test` with a `test.step` per stage instead of four shared `it`s,
 *    so a failure points at the offending stage without leaking browser state.
 *  - The FTR's `expect((await find.byCssSelector('dd')).getVisibleText()).to.eql(true)`
 *    assertion is dropped: it compared an un-awaited `Promise` to a boolean, so it
 *    asserted nothing meaningful. The lens-render + breakdown assertions cover the
 *    intent (the prefilled visualization renders and responds to a breakdown).
 */
test.describe(
  'Exploratory View - prefilled from the UX app',
  { tag: tags.stateful.classic },
  () => {
    // Matches the RUM archive's data window (Jan 2021); the range propagates from
    // the UX app into the prefilled Exploratory View URL.
    const rangeFrom = '2021-01-17T16:46:15.338Z';
    const rangeTo = '2021-01-19T17:01:32.309Z';

    test('opens a prefilled Exploratory View and breaks down by user agent', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      const { exploratoryView } = pageObjects;

      await test.step('go to the UX app', async () => {
        await browserAuth.loginAsAdmin();
        await page.gotoApp('ux', { params: { rangeFrom, rangeTo } });
        await expect(page.testSubj.locator('uxAnalyzeBtn')).toBeVisible();
      });

      await test.step('open Exploratory View via "Explore data"', async () => {
        await page.testSubj.click('uxAnalyzeBtn');
        await exploratoryView.waitForLoadingToFinish();
      });

      await test.step('renders a prefilled lens visualization', async () => {
        await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
        await expect(
          page.locator('div[data-title="Prefilled from exploratory view app"]')
        ).toBeVisible();
      });

      await test.step('breaks the series down by user_agent.name', async () => {
        await exploratoryView.editSeries(0);
        await exploratoryView.selectSeriesBreakdownByField('user_agent.name');
        await exploratoryView.applySeriesChanges();
        await exploratoryView.waitForLoadingToFinish();

        // A per-browser breakdown yields one legend item per distinct user agent.
        await expect(exploratoryView.echLegendItemLocator).toHaveCount(11);
      });
    });
  }
);
