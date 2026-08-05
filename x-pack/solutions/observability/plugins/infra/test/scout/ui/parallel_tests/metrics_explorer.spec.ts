/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { EXTENDED_TIMEOUT } from '../fixtures/constants';

// Metrics Explorer is a deprecated, stateful-only feature (disabled on serverless), so this spec
// is tagged stateful-classic only — mirroring the original FTR suite's deployment coverage.

const METRICS_EXPLORER_VIEW_TYPE = 'metrics-explorer-view';

// The infra/metrics_and_logs es_archive holds metricbeat data from Oct 17, 2018 (UTC), spanning a
// ~16-minute window. `test.use({ timezoneId: 'GMT' })` pins the browser timezone so this absolute
// range maps directly onto that window, yielding the same six host charts the FTR suite asserted.
const DATE_RANGE = {
  from: 'Oct 17, 2018 @ 19:42:21.208',
  to: 'Oct 17, 2018 @ 19:58:03.952',
};

// The archive contains six hosts, so grouping by `host.name` renders one chart per host.
const EXPECTED_HOST_CHART_COUNT = 6;

// Metrics Explorer ships with these three metrics selected by default.
const DEFAULT_METRICS = [
  'system.cpu.total.norm.pct',
  'kubernetes.pod.cpu.usage.node.pct',
  'docker.cpu.total.pct',
];

// Twenty metricbeat fields used to drive the selection past `METRICS_EXPLORER_API_MAX_METRICS`.
const TWENTY_METRICS = [
  'process.cpu.pct',
  'process.memory.pct',
  'system.core.total.pct',
  'system.core.user.pct',
  'system.core.nice.pct',
  'system.core.idle.pct',
  'system.core.iowait.pct',
  'system.core.irq.pct',
  'system.core.softirq.pct',
  'system.core.steal.pct',
  'system.cpu.nice.pct',
  'system.cpu.idle.pct',
  'system.cpu.iowait.pct',
  'system.cpu.irq.pct',
  'system.cpu.softirq.pct',
  'system.cpu.steal.pct',
  'system.cpu.user.norm.pct',
  'system.memory.free',
  'kubernetes.pod.cpu.usage.node.pct',
  'docker.cpu.total.pct',
];

test.use({ timezoneId: 'GMT' });

test.describe('Metrics Explorer', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient }) => {
    // Start from a clean slate so a previous (possibly crashed) run can't skew the saved-view
    // counts asserted below. The built-in "Default view" is not a saved object, so it survives.
    await kbnClient.savedObjects.clean({ types: [METRICS_EXPLORER_VIEW_TYPE] });
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: [METRICS_EXPLORER_VIEW_TYPE] });
  });

  test('renders the page title and the default metrics', async ({
    page,
    pageObjects: { metricsExplorerPage },
  }) => {
    // The first test on the worker absorbs the metrics app cold start (bundle download + data view
    // resolution), which can approach the default 60s timeout under CI contention.
    test.setTimeout(180_000);

    await metricsExplorerPage.goto();

    await expect(page).toHaveTitle(
      /Metrics Explorer - Infrastructure inventory - Observability - Elastic/
    );
    await expect(metricsExplorerPage.selectedMetricPills).toHaveCount(DEFAULT_METRICS.length);
  });

  test('removes the default metrics and adds a new one', async ({
    pageObjects: { metricsExplorerPage },
  }) => {
    await metricsExplorerPage.goto();
    await metricsExplorerPage.setTimeRange(DATE_RANGE.from, DATE_RANGE.to);
    await expect(metricsExplorerPage.selectedMetricPills).toHaveCount(DEFAULT_METRICS.length);

    // The "Missing Metric" prompt renders inside a chart, so the data-backed charts must render
    // before the metrics are cleared — otherwise the empty time range shows the "no data" prompt.
    await expect(metricsExplorerPage.charts).not.toHaveCount(0, { timeout: EXTENDED_TIMEOUT });

    for (const metric of DEFAULT_METRICS) {
      await metricsExplorerPage.removeMetric(metric);
    }
    await expect(metricsExplorerPage.selectedMetricPills).toHaveCount(0);
    await expect(metricsExplorerPage.missingMetricMessage).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });

    await metricsExplorerPage.addMetric('system.cpu.user.pct');
    await expect(metricsExplorerPage.selectedMetricPills).toHaveCount(1);
  });

  test('renders a chart per host when grouping by host.name', async ({
    pageObjects: { metricsExplorerPage },
  }) => {
    await metricsExplorerPage.goto();
    await metricsExplorerPage.setTimeRange(DATE_RANGE.from, DATE_RANGE.to);

    await metricsExplorerPage.setGroupBy('host.name');
    await expect(metricsExplorerPage.charts).toHaveCount(EXPECTED_HOST_CHART_COUNT, {
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('renders area charts by default and can switch to bar charts', async ({
    pageObjects: { metricsExplorerPage },
  }) => {
    await metricsExplorerPage.goto();
    await metricsExplorerPage.setTimeRange(DATE_RANGE.from, DATE_RANGE.to);

    await metricsExplorerPage.setGroupBy('host.name');
    await expect(metricsExplorerPage.charts).toHaveCount(EXPECTED_HOST_CHART_COUNT, {
      timeout: EXTENDED_TIMEOUT,
    });

    expect(await metricsExplorerPage.getFirstChartDescription()).toContain('area chart');

    await metricsExplorerPage.switchChartType('bar');
    await expect
      .poll(() => metricsExplorerPage.getFirstChartDescription(), { timeout: EXTENDED_TIMEOUT })
      .toContain('bar chart');
  });

  test('does not allow selecting more than the maximum number of metrics', async ({
    pageObjects: { metricsExplorerPage },
  }) => {
    // Selecting twenty metrics one by one is a long interaction sequence.
    test.setTimeout(180_000);

    await metricsExplorerPage.goto();
    await metricsExplorerPage.clearMetrics();
    await expect(metricsExplorerPage.selectedMetricPills).toHaveCount(0);

    for (const metric of TWENTY_METRICS) {
      await metricsExplorerPage.addMetric(metric);
    }
    await expect(metricsExplorerPage.selectedMetricPills).toHaveCount(TWENTY_METRICS.length);

    await metricsExplorerPage.openMetricOptions();
    await expect(metricsExplorerPage.maxMetricsReachedMessage).toBeVisible();
  });

  test('loads the default saved view and toggles the saved views popover', async ({
    page,
    pageObjects: { metricsExplorerPage, savedViews },
  }) => {
    await metricsExplorerPage.goto();
    await savedViews.waitForViewsToLoad();
    await expect(savedViews.selector).toHaveText('Default view');

    await savedViews.selector.click();
    await expect(savedViews.saveNewViewButton).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(savedViews.saveNewViewButton).toBeHidden();
  });

  test('creates, loads, and updates saved views', async ({
    page,
    pageObjects: { metricsExplorerPage, savedViews },
  }) => {
    const nameButtons = savedViews.manageViewsTable.getByTestId('infraRenderNameButton');

    await metricsExplorerPage.goto();
    await savedViews.waitForViewsToLoad();

    await test.step('creates a new saved view and loads it', async () => {
      await savedViews.createView('view1');
      await expect(savedViews.selector).toHaveText('view1');
    });

    await test.step('loads the default view from the manage views flyout', async () => {
      await savedViews.selector.click();
      await savedViews.manageViewsButton.click();
      await expect(savedViews.manageViewsFlyout).toBeVisible();
      // "Default view" (built-in) + the freshly created "view1".
      await expect(nameButtons).toHaveCount(2);

      await nameButtons.filter({ hasText: 'Default view' }).click();
      await savedViews.waitForViewsToLoad();
      await expect(savedViews.manageViewsFlyout).toBeHidden();
      await expect(savedViews.selector).toHaveText('Default view');
    });

    await test.step('creates a second saved view', async () => {
      await savedViews.createView('view2');
      await expect(savedViews.selector).toHaveText('view2');

      await savedViews.selector.click();
      await savedViews.manageViewsButton.click();
      await expect(savedViews.manageViewsFlyout).toBeVisible();
      await expect(nameButtons).toHaveCount(3);

      await page.keyboard.press('Escape');
      await expect(savedViews.manageViewsFlyout).toBeHidden();
    });

    await test.step('updates the current saved view', async () => {
      await savedViews.saveCurrentView('view3');
      await expect(savedViews.selector).toHaveText('view3');

      await savedViews.selector.click();
      await savedViews.manageViewsButton.click();
      await expect(savedViews.manageViewsFlyout).toBeVisible();
      // Updating renames "view2" to "view3", so the count stays at three.
      await expect(nameButtons).toHaveCount(3);
    });
  });
});
