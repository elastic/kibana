/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { getNewRule } from '../../../common/rule_objects';
import { ALERTS_URL } from '../../../common/urls';

test.describe('KPI visualizations in Alerts Page', { tag: tags.deploymentAgnostic }, () => {
  const rule = getNewRule({ rule_id: 'new-custom-rule' });

  test.beforeEach(async ({ browserAuth, page, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices, rule);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should navigate through clicking chart names', async ({ page }) => {
    await test.step('Summary charts are displayed by default', async () => {
      await expect(page.testSubj.locator('alert-summary-charts')).toBeVisible();
      const overviewButton = page.testSubj.locator('chart-select-overview');
      await expect(overviewButton).toHaveClass(/euiButtonGroupButton-isSelected/);
      await expect(page.testSubj.locator('severity-level-donut-chart')).toBeVisible();
    });

    await test.step('Display histogram charts', async () => {
      const trendButton = page.testSubj.locator('chart-select-trend');
      await trendButton.click();
      await expect(trendButton).toHaveClass(/euiButtonGroupButton-isSelected/);
      await expect(page.testSubj.locator('alerts-histogram-panel')).toBeVisible();
    });

    await test.step('Display count table', async () => {
      const tableButton = page.testSubj.locator('chart-select-table');
      await tableButton.click();
      await expect(tableButton).toHaveClass(/euiButtonGroupButton-isSelected/);
      await expect(page.testSubj.locator('alert-count-table')).toBeVisible();
    });

    await test.step('Display treemap', async () => {
      const treemapButton = page.testSubj.locator('chart-select-treemap');
      await treemapButton.click();
      await expect(treemapButton).toHaveClass(/euiButtonGroupButton-isSelected/);
      await expect(page.testSubj.locator('alerts-treemap')).toBeVisible();
    });
  });

  test('should display/hide collapsed chart when clicking on the toggle', async ({ page }) => {
    await test.step('Summary charts visible by default', async () => {
      await expect(page.testSubj.locator('severity-level-donut-chart')).toBeVisible();
    });

    await test.step('Toggle collapses the charts', async () => {
      const toggleButton = page.testSubj.locator('query-toggle-header');
      await toggleButton.click();
      await expect(page.testSubj.locator('severity-level-donut-chart')).toBeHidden();
    });

    await test.step('Toggle expands the charts again', async () => {
      const toggleButton = page.testSubj.locator('query-toggle-header');
      await toggleButton.click();
      await expect(page.testSubj.locator('severity-level-donut-chart')).toBeVisible();
    });
  });

  test('should add a filter in from histogram legend', async ({ page }) => {
    const trendButton = page.testSubj.locator('chart-select-trend');
    await trendButton.click();
    await expect(page.testSubj.locator('alerts-histogram-panel')).toBeVisible();

    const legendItem = page.locator('.echLegendItem__label').getByText(rule.name);
    await legendItem.click();

    const filterFor = page.getByText('Filter for');
    await filterFor.click();

    const filterBadge = page.testSubj.locator('filter-badge');
    await expect(filterBadge).toContainText(`kibana.alert.rule.name: ${rule.name}`);
  });

  test('should add a filter out from histogram legend', async ({ page }) => {
    const trendButton = page.testSubj.locator('chart-select-trend');
    await trendButton.click();
    await expect(page.testSubj.locator('alerts-histogram-panel')).toBeVisible();

    const legendItem = page.locator('.echLegendItem__label').getByText(rule.name);
    await legendItem.click();

    const filterOut = page.getByText('Filter out');
    await filterOut.click();

    const filterBadge = page.testSubj.locator('filter-badge');
    await expect(filterBadge).toContainText(`NOT kibana.alert.rule.name: ${rule.name}`);
  });

  test('should add to Timeline from histogram legend', async ({ page }) => {
    const trendButton = page.testSubj.locator('chart-select-trend');
    await trendButton.click();
    await expect(page.testSubj.locator('alerts-histogram-panel')).toBeVisible();

    const legendItem = page.locator('.echLegendItem__label').getByText(rule.name);
    await legendItem.click();

    const addToTimeline = page.getByText('Add to Timeline');
    await addToTimeline.click();

    const toaster = page.locator('.euiToast');
    await expect(toaster).toContainText(`Added ${rule.name} to Timeline`);
  });
});
