/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import { DATE_WITH_HOSTS_DATA, HOST1_NAME } from '../../fixtures/constants';

test.use({
  timezoneId: 'GMT',
});

test.describe(
  'Infrastructure Inventory - Host Asset Details Flyout',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.goToPage();
      // Dismiss k8s tour if it's present to avoid interference with other test assertions
      // The k8s tour specific test will take care of adding it back during its own execution
      await inventoryPage.dismissK8sTour();
      await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);
      await inventoryPage.clickWaffleNode(HOST1_NAME);
      await page.getByRole('dialog').getByRole('heading', { name: HOST1_NAME }).waitFor();
    });

    test('Overview Tab', async ({ pageObjects: { assetDetailsPage } }) => {
      await test.step('is selected as default tab', async () => {
        await expect(assetDetailsPage.overviewTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('renders KPI charts', async () => {
        await expect(
          assetDetailsPage.overviewTab.kpiCpuUsageChart.getByRole('heading', { name: 'CPU Usage' })
        ).toBeVisible();
        await expect(
          assetDetailsPage.overviewTab.kpiNormalizedLoadChart.getByRole('heading', {
            name: 'Normalized Load',
          })
        ).toBeVisible();
        await expect(
          assetDetailsPage.overviewTab.kpiMemoryUsageChart.getByRole('heading', {
            name: 'Memory Usage',
          })
        ).toBeVisible();
        await expect(
          assetDetailsPage.overviewTab.kpiDiskUsageChart.getByRole('heading', {
            name: 'Disk Usage',
          })
        ).toBeVisible();
      });

      await test.step('renders metadata section', async () => {
        await expect(assetDetailsPage.overviewTab.metadataSection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metadataSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.overviewTab.metadataSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.overviewTab.metadataShowAllButton).toBeVisible();

        await expect(assetDetailsPage.overviewTab.metadataSummaryItems).toHaveCount(2);
        await expect(
          assetDetailsPage.overviewTab.metadataSummaryItems.filter({ hasText: 'Host IP' })
        ).toBeVisible();
        await expect(
          assetDetailsPage.overviewTab.metadataSummaryItems.filter({ hasText: 'Host OS version' })
        ).toBeVisible();

        await assetDetailsPage.overviewTab.metadataSectionCollapsible.click();
        await expect(assetDetailsPage.overviewTab.metadataSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.overviewTab.metadataSectionGroup).toHaveAttribute('inert');
      });

      await test.step('renders alert section', async () => {
        await expect(assetDetailsPage.overviewTab.alertsSection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.alertsSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.overviewTab.alertsSectionGroup).toHaveAttribute('inert');

        await assetDetailsPage.overviewTab.alertsSectionCollapsible.click();
        await expect(assetDetailsPage.overviewTab.alertsSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.overviewTab.alertsSectionGroup).not.toHaveAttribute('inert');
        await expect(assetDetailsPage.overviewTab.alertsShowAllButton).toBeVisible();

        await expect(assetDetailsPage.overviewTab.alertsContent).toBeVisible();
      });

      await test.step('renders services section', async () => {
        await expect(assetDetailsPage.overviewTab.servicesSection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.servicesSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.overviewTab.servicesSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.overviewTab.servicesShowAllButton).toBeVisible();

        await expect(assetDetailsPage.overviewTab.servicesContainer).toBeVisible();

        await assetDetailsPage.overviewTab.servicesSectionCollapsible.click();
        await expect(assetDetailsPage.overviewTab.servicesSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.overviewTab.servicesSectionGroup).toHaveAttribute('inert');
      });

      await test.step('renders metrics section', async () => {
        await expect(assetDetailsPage.overviewTab.metricsSection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.overviewTab.metricsSectionGroup).not.toHaveAttribute('inert');

        await expect(assetDetailsPage.overviewTab.metricsCpuSection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsCpuSectionTitle).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsCpuShowAllButton).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsCpuUsageChart).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsCpuNormalizedLoadChart).toBeVisible();

        await expect(assetDetailsPage.overviewTab.metricsMemorySection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsMemorySectionTitle).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsMemoryShowAllButton).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsMemoryUsageChart).toBeVisible();

        await expect(assetDetailsPage.overviewTab.metricsNetworkSection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsNetworkSectionTitle).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsNetworkShowAllButton).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsNetworkChart).toBeVisible();

        await expect(assetDetailsPage.overviewTab.metricsDiskSection).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsDiskSectionTitle).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsDiskShowAllButton).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsDiskUsageChart).toBeVisible();
        await expect(assetDetailsPage.overviewTab.metricsDiskIOChart).toBeVisible();

        await assetDetailsPage.overviewTab.metricsSectionCollapsible.click();
        await expect(assetDetailsPage.overviewTab.metricsSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.overviewTab.metricsSectionGroup).toHaveAttribute('inert');
      });
    });
  }
);
