/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  HOST1_NAME,
  HOSTS,
  SERVICE_PER_HOST_COUNT,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  EXTENDED_TIMEOUT,
} from '../../fixtures/constants';

test.describe(
  'Hosts Page - Flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { hostsPage } }) => {
      await browserAuth.loginAsViewer();
      await hostsPage.goToPage({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
      });
      await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
    });

    test('Overview Tab - KPI charts and collapsible sections', async ({
      pageObjects: { hostsPage, assetDetailsPage },
    }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('verify KPI charts are rendered', async () => {
        await expect(
          assetDetailsPage.hostOverviewTab.kpiCpuUsageChart.getByRole('heading', {
            name: 'CPU Usage',
          })
        ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(
          assetDetailsPage.hostOverviewTab.kpiNormalizedLoadChart.getByRole('heading', {
            name: 'Normalized Load',
          })
        ).toBeVisible();
        await expect(
          assetDetailsPage.hostOverviewTab.kpiMemoryUsageChart.getByRole('heading', {
            name: 'Memory Usage',
          })
        ).toBeVisible();
        await expect(
          assetDetailsPage.hostOverviewTab.kpiDiskUsageChart.getByRole('heading', {
            name: 'Disk Usage',
          })
        ).toBeVisible();
      });

      await test.step('verify collapsible sections exist', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metadataSectionCollapsible).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.alertsSectionCollapsible).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsSectionCollapsible).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.servicesSectionCollapsible).toBeVisible();
      });

      await test.step('verify metrics chart sections', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuNormalizedLoadChart).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsMemoryUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskIOChart).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsNetworkChart).toBeVisible();
      });
    });

    test('Overview Tab - Services section', async ({
      pageObjects: { hostsPage, assetDetailsPage },
    }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('verify services section is visible with correct count', async () => {
        await expect(assetDetailsPage.hostOverviewTab.servicesContainer).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        const serviceLinks = assetDetailsPage.hostOverviewTab.servicesContainer.getByRole('link');
        await expect(serviceLinks).toHaveCount(SERVICE_PER_HOST_COUNT);
      });
    });

    test('Metadata Tab', async ({ pageObjects: { hostsPage, assetDetailsPage } }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('navigate to metadata tab', async () => {
        await assetDetailsPage.metadataTab.clickTab();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('verify metadata table is visible', async () => {
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();
        await expect(assetDetailsPage.metadataTab.searchBar).toBeVisible();
      });
    });

    test('Metrics Tab', async ({ pageObjects: { hostsPage, assetDetailsPage } }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('navigate to metrics tab', async () => {
        await assetDetailsPage.hostMetricsTab.clickTab();
        await expect(assetDetailsPage.hostMetricsTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('verify metrics content is visible', async () => {
        await expect(assetDetailsPage.hostMetricsTab.cpuUsageChart).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });

    test('Processes Tab', async ({ pageObjects: { hostsPage }, page }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('navigate to processes tab', async () => {
        const processesTab = page.getByTestId('infraAssetDetailsProcessesTab');
        await processesTab.click();
        await expect(processesTab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('verify processes content is visible', async () => {
        await expect(page.getByTestId('infraAssetDetailsProcessesTabContent')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });

    test('Logs Tab', async ({ pageObjects: { hostsPage, assetDetailsPage } }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('navigate to logs tab', async () => {
        await assetDetailsPage.logsTag.clickTab();
        await expect(assetDetailsPage.logsTag.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('verify logs content is visible', async () => {
        await expect(assetDetailsPage.logsTag.table).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });
    });

    test('Open as page and return', async ({
      pageObjects: { hostsPage, assetDetailsPage },
      page,
    }) => {
      await hostsPage.openHostFlyout(HOST1_NAME);

      await test.step('click open as page', async () => {
        await assetDetailsPage.openAsPageButton.click();
        const url = new URL(page.url());
        expect(url.pathname).toBe(`/app/metrics/detail/host/${encodeURIComponent(HOST1_NAME)}`);
      });

      await test.step('verify date range is preserved', async () => {
        const datePicker = page.getByTestId('superDatePickerstartDatePopoverButton');
        await expect(datePicker).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(datePicker).toContainText('Mar 28, 2023');
      });

      await test.step('return to hosts view', async () => {
        await expect(assetDetailsPage.returnButton).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await assetDetailsPage.returnButton.click();
        await expect(
          page.getByRole('dialog').getByRole('heading', { name: HOST1_NAME })
        ).toBeVisible();
      });
    });

    test('Dashboards Tab', async ({ pageObjects: { hostsPage }, page, kbnClient }) => {
      const CUSTOM_DASHBOARDS_SETTING = 'observability:enableInfrastructureAssetCustomDashboards';

      await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });

      try {
        await hostsPage.goToPage({
          from: DATE_WITH_HOSTS_DATA_FROM,
          to: DATE_WITH_HOSTS_DATA_TO,
        });
        await expect(hostsPage.tableRows).toHaveCount(HOSTS.length);
        await hostsPage.openHostFlyout(HOST1_NAME);

        await test.step('navigate to dashboards tab', async () => {
          const dashboardsTab = page.getByTestId('infraAssetDetailsDashboardsTab');
          await dashboardsTab.click();
          await expect(dashboardsTab).toHaveAttribute('aria-selected', 'true');
        });

        await test.step('verify dashboards splash screen is visible', async () => {
          await expect(page.getByTestId('infraAddDashboard')).toBeVisible({
            timeout: EXTENDED_TIMEOUT,
          });
        });
      } finally {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: false });
      }
    });
  }
);
