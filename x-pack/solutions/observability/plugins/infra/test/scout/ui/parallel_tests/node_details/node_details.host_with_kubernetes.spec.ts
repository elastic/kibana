/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { expect } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT, test } from '../../fixtures';
import {
  DATE_WITH_K8S_HOSTS_DATA_FROM,
  DATE_WITH_K8S_HOSTS_DATA_TO,
  K8S_HOST_NAME,
} from '../../fixtures/constants';

const START_K8S_HOST_DATE = moment.utc(DATE_WITH_K8S_HOSTS_DATA_FROM);
const END_K8S_HOST_DATE = moment.utc(DATE_WITH_K8S_HOSTS_DATA_TO);

test.describe('Node Details: host with kubernetes section', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { nodeDetailsPage } }) => {
    await browserAuth.loginAsViewer();
    await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', {
      name: K8S_HOST_NAME,
      from: START_K8S_HOST_DATE,
      to: END_K8S_HOST_DATE,
    });
  });

  test('Overview Tab - KPI tiles show correct values', async ({
    pageObjects: { nodeDetailsPage },
  }) => {
    await nodeDetailsPage.clickOverviewTab();
    const kpiTiles = [
      { metric: 'cpuUsage', value: '50.0%' },
      { metric: 'normalizedLoad1m', value: '18.8%' },
      { metric: 'memoryUsage', value: '35.0%' },
      { metric: 'diskUsage', value: '1,223.0%' },
    ];

    for (const { metric, value } of kpiTiles) {
      await test.step(`verify ${metric} KPI tile value`, async () => {
        const tileValue = await nodeDetailsPage.getKPITileValue(metric);
        expect(tileValue).toBe(value);
      });
    }
  });

  test('Overview Tab - renders kubernetes charts', async ({ pageObjects: { nodeDetailsPage } }) => {
    await nodeDetailsPage.clickOverviewTab();
    await nodeDetailsPage.waitForChartsToLoad();
    const charts = await nodeDetailsPage.getOverviewTabKubernetesMetricCharts();
    await expect(charts).toHaveCount(2);
  });

  test('Overview Tab - renders host charts', async ({ pageObjects: { nodeDetailsPage }, page }) => {
    await nodeDetailsPage.clickOverviewTab();
    const metricCharts = [
      { metric: 'cpu' },
      { metric: 'memory' },
      { metric: 'disk' },
      { metric: 'network' },
    ];

    await expect(
      page.getByRole('listitem').filter({ hasText: 'Normalized LoadAverage18.8%' })
    ).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });

    for (const { metric } of metricCharts) {
      await nodeDetailsPage.expectChartsCount(`infraAssetDetailsHostChartsSection${metric}`, 1);
    }
  });

  test('Metrics Tab - renders kubernetes charts', async ({ pageObjects: { nodeDetailsPage } }) => {
    await nodeDetailsPage.clickMetricsTab();
    const charts = await nodeDetailsPage.getMetricsTabKubernetesCharts();
    await expect(charts).toHaveCount(4);
  });

  test('Metrics Tab - renders host charts', async ({ pageObjects: { nodeDetailsPage }, page }) => {
    await nodeDetailsPage.clickMetricsTab();
    await expect(page.getByTestId('infraMetricsQuickAccessItemcpu')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });

    await nodeDetailsPage.expectChartsCount('infraAssetDetailsHostChartsSection', 9);
    await nodeDetailsPage.expectChartsCount('infraAssetDetailsHostChartsChart', 17);
  });

  test('Metrics Tab - renders quick access items', async ({ pageObjects: { nodeDetailsPage } }) => {
    await nodeDetailsPage.clickMetricsTab();
    const metrics = ['cpu', 'memory', 'disk', 'network', 'log', 'kubernetes'];
    for (const metric of metrics) {
      await test.step(`verify quick access item for ${metric} exists`, async () => {
        await expect(
          nodeDetailsPage.page.testSubj.locator(`infraMetricsQuickAccessItem${metric}`)
        ).toBeVisible();
      });
    }
  });
});
