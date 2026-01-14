/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import {
  DATE_WITH_HOSTS_DATA,
  HOST1_NAME,
  HOST_LOGS,
  HOSTS_METADATA_FIELDS,
} from '../../fixtures/constants';
import type { MetricsTabQuickAccessItem } from '../../fixtures/page_objects/asset_details/metrics_tab';

test.use({
  timezoneId: 'GMT',
});

const METADATA_FIELD = HOSTS_METADATA_FIELDS[1];

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

    test('Metadata Tab', async ({ pageObjects: { assetDetailsPage } }) => {
      await test.step('accessible from default tab', async () => {
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'false');
        await assetDetailsPage.metadataTab.clickTab();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('render expected content', async () => {
        await expect(assetDetailsPage.metadataTab.searchBar).toBeVisible();
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();
        await expect(
          assetDetailsPage.metadataTab.tableHeader.getByLabel('Pin fields')
        ).toBeVisible();
        await expect(assetDetailsPage.metadataTab.tableHeader.getByText('Field')).toBeVisible();
        await expect(assetDetailsPage.metadataTab.tableHeader.getByText('Value')).toBeVisible();
      });

      await test.step('pin a metadata field row', async () => {
        await assetDetailsPage.metadataTab.pinField(METADATA_FIELD);
        const pinButtons = assetDetailsPage.metadataTab.getPinButtonsForField(METADATA_FIELD);
        await expect(pinButtons.pin).toBeHidden();
        await expect(pinButtons.unpin).toBeVisible();
      });

      await test.step('unpin a metadata field row', async () => {
        await assetDetailsPage.metadataTab.unpinField(METADATA_FIELD);
        const pinButtons = assetDetailsPage.metadataTab.getPinButtonsForField(METADATA_FIELD);
        await expect(pinButtons.pin).toBeVisible();
        await expect(pinButtons.unpin).toBeHidden();
      });

      await test.step('filter fields via search bar', async () => {
        await assetDetailsPage.metadataTab.filterField(METADATA_FIELD);
        await expect(assetDetailsPage.metadataTab.tableRows).toHaveCount(1);
        const row = assetDetailsPage.metadataTab.getRowForField(METADATA_FIELD);
        await expect(row).toBeVisible();
      });
    });

    test('Metadata Tab - Is accessible from overview tab section show all', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      await assetDetailsPage.overviewTab.metadataShowAllButton.click();
      await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
    });

    test('Metrics Tab', async ({ pageObjects: { assetDetailsPage } }) => {
      await test.step('accessible from default tab', async () => {
        await expect(assetDetailsPage.metricsTab.tab).toHaveAttribute('aria-selected', 'false');
        await assetDetailsPage.metricsTab.clickTab();
        await expect(assetDetailsPage.metricsTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('quick access menu renders expected content', async () => {
        const quickAccessItems: MetricsTabQuickAccessItem[] = [
          'CPU',
          'Memory',
          'Network',
          'Disk',
          'Log Rate',
        ];

        await expect(assetDetailsPage.metricsTab.quickAccessItems).toHaveText(quickAccessItems);
      });

      await test.step('navigate to CPU metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.metricsTab.clickQuickAccessItem('CPU');
        await expect(assetDetailsPage.metricsTab.cpuSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.metricsTab.cpuUsageChart).toBeVisible();
        await expect(assetDetailsPage.metricsTab.cpuUsageBreakdownChart).toBeVisible();
        await expect(assetDetailsPage.metricsTab.cpuNormalizedLoadChart).toBeVisible();
        await expect(assetDetailsPage.metricsTab.cpuLoadBreakdownChart).toBeVisible();
      });

      await test.step('navigate to Memory metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.metricsTab.clickQuickAccessItem('Memory');
        await expect(assetDetailsPage.metricsTab.memorySectionTitle).toBeInViewport();

        await expect(assetDetailsPage.metricsTab.memoryUsageChart).toBeVisible();
        await expect(assetDetailsPage.metricsTab.memoryUsageBreakdownChart).toBeVisible();
      });

      await test.step('navigate to Network metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.metricsTab.clickQuickAccessItem('Network');
        await expect(assetDetailsPage.metricsTab.networkSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.metricsTab.networkChart).toBeVisible();
      });

      await test.step('navigate to Disk metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.metricsTab.clickQuickAccessItem('Disk');
        await expect(assetDetailsPage.metricsTab.diskSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.metricsTab.diskUsageChart).toBeVisible();
        await expect(assetDetailsPage.metricsTab.diskIOChart).toBeVisible();
        await expect(assetDetailsPage.metricsTab.diskThroughputChart).toBeVisible();
      });

      await test.step('navigate to Log metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.metricsTab.clickQuickAccessItem('Log Rate');
        await expect(assetDetailsPage.metricsTab.logSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.metricsTab.logRateChart).toBeVisible();
      });
    });

    test('Metrics Tab - Sections are accessible from overview tab section show all', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      const goBackToOverviewTab = async () => {
        await assetDetailsPage.overviewTab.tab.click();
        await expect(assetDetailsPage.overviewTab.tab).toHaveAttribute('aria-selected', 'true');
      };

      await test.step('cpu section', async () => {
        await assetDetailsPage.overviewTab.metricsCpuShowAllButton.click();
        await expect(assetDetailsPage.metricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metricsTab.cpuSectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('memory section', async () => {
        await assetDetailsPage.overviewTab.metricsMemoryShowAllButton.click();
        await expect(assetDetailsPage.metricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metricsTab.memorySectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('network section', async () => {
        await assetDetailsPage.overviewTab.metricsNetworkShowAllButton.click();
        await expect(assetDetailsPage.metricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metricsTab.networkSectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('disk section', async () => {
        await assetDetailsPage.overviewTab.metricsDiskShowAllButton.click();
        await expect(assetDetailsPage.metricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metricsTab.diskSectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });
    });

    test('Logs Tab', async ({ page, pageObjects: { assetDetailsPage } }) => {
      await test.step('accessible from default tab', async () => {
        await expect(assetDetailsPage.logsTag.tab).toHaveAttribute('aria-selected', 'false');
        await assetDetailsPage.logsTag.clickTab();
        await expect(assetDetailsPage.logsTag.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('render expected content', async () => {
        await expect(assetDetailsPage.logsTag.searchBar).toBeVisible();
        await expect(assetDetailsPage.logsTag.openInDiscoverButton).toBeVisible();
        await expect(assetDetailsPage.logsTag.table).toBeVisible();
        await expect(assetDetailsPage.logsTag.tableTotalDocumentsLabel).toBeVisible();
      });

      await test.step('filter logs via search bar and open the query in discover', async () => {
        await assetDetailsPage.logsTag.filterTable(`"${HOST_LOGS[0].message}"`);

        const discoverQuery = `(host.name: ${HOST1_NAME}) and ("${HOST_LOGS[0].message}")`;

        await assetDetailsPage.logsTag.openInDiscoverButton.click();
        await expect(page.getByTestId('queryInput')).toHaveValue(discoverQuery);
      });
    });
  }
);
