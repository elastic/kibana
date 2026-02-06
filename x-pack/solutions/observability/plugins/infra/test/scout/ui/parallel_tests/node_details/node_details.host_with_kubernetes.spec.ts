/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
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

  test('Overview Tab validates all KPIs and charts', async ({
    pageObjects: { nodeDetailsPage },
    page,
  }) => {
    await nodeDetailsPage.clickOverviewTab();
    await nodeDetailsPage.waitForChartsToLoad();

    // Soft assertions for all KPIs
    const kpiTiles = [
      { metric: 'cpuUsage', value: '50.0%' },
      { metric: 'normalizedLoad1m', value: '18.8%' },
      { metric: 'memoryUsage', value: '35.0%' },
      { metric: 'diskUsage', value: '1,223.0%' },
    ];
    for (const { metric, value } of kpiTiles) {
      expect.soft(await nodeDetailsPage.getKPITileValue(metric)).toBe(value);
    }

    // Kubernetes charts
    await expect.soft(await nodeDetailsPage.getOverviewTabKubernetesMetricCharts()).toHaveCount(2);

    // Host charts (merged)
    const hostMetrics = ['cpu', 'memory', 'disk', 'network'];
    for (const metric of hostMetrics) {
      await nodeDetailsPage.expectChartsCount(`infraAssetDetailsHostChartsSection${metric}`, 2);
    }
    await expect
      .soft(page.getByRole('listitem').filter({ hasText: 'Normalized LoadAverage18.8%' }))
      .toBeVisible();
  });

  test('Metrics Tab validates all charts and quick access', async ({
    pageObjects: { nodeDetailsPage, assetDetailsPage },
  }) => {
    await nodeDetailsPage.clickMetricsTab();
    await nodeDetailsPage.waitForChartsToLoad();

    // Quick access items
    const quickAccess = ['cpu', 'memory', 'disk', 'network', 'log', 'kubernetes'];
    for (const metric of quickAccess) {
      await expect
        .soft(nodeDetailsPage.page.testSubj.locator(`infraMetricsQuickAccessItem${metric}`))
        .toBeVisible();
    }

    // Kubernetes charts
    await expect.soft(await nodeDetailsPage.getMetricsTabKubernetesCharts()).toHaveCount(4);

    // Host charts by category (soft checks)
    await expect.soft(assetDetailsPage.hostMetricsTab.cpuUsageChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.cpuUsageBreakdownChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.cpuNormalizedLoadChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.cpuLoadBreakdownChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.memoryUsageChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.memoryUsageBreakdownChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.networkChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.diskUsageChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.diskIOChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.diskThroughputChart).toBeVisible();
    await expect.soft(assetDetailsPage.hostMetricsTab.logRateChart).toBeVisible();

    await nodeDetailsPage.expectChartsCount('infraAssetDetailsHostChartsSection', 18);
  });
});
