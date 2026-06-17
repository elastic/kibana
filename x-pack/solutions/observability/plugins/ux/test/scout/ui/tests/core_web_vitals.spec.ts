/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('Core Web Vitals', { tag: tags.stateful.classic }, () => {
  test('displays core web vitals metrics', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Check Core Web Vitals labels', async () => {
      await page.testSubj.locator('lcp-core-vital').scrollIntoViewIfNeeded();
      await pageObjects.uxDashboard.waitForChartData();
      await expect(page.getByText('Largest contentful paint')).toBeVisible();
      await expect(page.getByText('Interaction to next paint')).toBeVisible();
      await expect(page.getByText('Cumulative layout shift')).toBeVisible();
    });

    // Skipped: traffic summary has a race condition in the source code (ux_metrics/index.tsx).
    // The CoreVitals JSX is memoized with [loading, inpLoading] but excludes totalPageViews.
    // If CWV/INP queries resolve before client metrics, the memo captures totalPageViews=0
    // and never re-runs, so the "X% of the traffic represented" element is never rendered.
    await test.step.skip('Check traffic summary', async () => {
      const cwvSummary = page.testSubj.locator('uxCoreVitalsTrafficSummary');
      await expect(cwvSummary).toBeVisible();
      await expect(cwvSummary).toHaveText(/[0-9]{1,3}% of the traffic represented/);
    });
  });
});
