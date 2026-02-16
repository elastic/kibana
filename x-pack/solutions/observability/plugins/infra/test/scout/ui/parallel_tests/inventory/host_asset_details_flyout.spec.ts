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
  LOG_LEVELS,
  EXTENDED_TIMEOUT,
  HOSTS_METADATA_FIELD,
  DEFAULT_HOSTS_INVENTORY_VIEW_NAME,
  BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
  DATE_WITH_HOSTS_DATA_TIMESTAMP,
} from '../../fixtures/constants';
import type { MetricsTabQuickAccessItem } from '../../fixtures/page_objects/asset_details/metrics_tab';

test.describe(
  'Infrastructure Inventory - Host Asset Details Flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let savedViewId: string = '';

    test.beforeAll(async ({ apiServices: { inventoryViews } }) => {
      const createResult = await inventoryViews.create({
        ...BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
        name: DEFAULT_HOSTS_INVENTORY_VIEW_NAME,
        nodeType: 'host',
        time: DATE_WITH_HOSTS_DATA_TIMESTAMP,
        metric: {
          type: 'cpuV2',
        },
      });

      savedViewId = createResult.id;
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPageWithSavedViewAndAssetDetailsFlyout({
        savedViewId,
        assetId: HOST1_NAME,
        entityType: 'host',
      });
    });

    test.afterAll(async ({ apiServices: { inventoryViews } }) => {
      await inventoryViews.deleteById(savedViewId);
    });

    test('Overview Tab', async ({ pageObjects: { assetDetailsPage } }) => {
      await test.step('is selected as default tab', async () => {
        await expect(assetDetailsPage.hostOverviewTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('renders KPI charts', async () => {
        await expect(
          assetDetailsPage.hostOverviewTab.kpiCpuUsageChart.getByRole('heading', {
            name: 'CPU Usage',
          })
        ).toBeVisible();
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

      await test.step('renders metadata section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metadataSection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metadataSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.hostOverviewTab.metadataSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.hostOverviewTab.metadataShowAllButton).toBeVisible();

        await expect(assetDetailsPage.hostOverviewTab.metadataSummaryItems).toHaveCount(2);
        await expect(
          assetDetailsPage.hostOverviewTab.metadataSummaryItems.filter({ hasText: 'Host IP' })
        ).toBeVisible();
        await expect(
          assetDetailsPage.hostOverviewTab.metadataSummaryItems.filter({
            hasText: 'Host OS version',
          })
        ).toBeVisible();

        await assetDetailsPage.hostOverviewTab.metadataSectionCollapsible.click();
        await expect(assetDetailsPage.hostOverviewTab.metadataSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.hostOverviewTab.metadataSectionGroup).toHaveAttribute(
          'inert'
        );
      });

      await test.step('renders alert section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.alertsSection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.alertsSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.hostOverviewTab.alertsSectionGroup).toHaveAttribute('inert');
        await assetDetailsPage.hostOverviewTab.alertsSectionCollapsible.click();
        await expect(assetDetailsPage.hostOverviewTab.alertsSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.hostOverviewTab.alertsSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.hostOverviewTab.alertsShowAllButton).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.alertsCreateRuleButton).toBeVisible();

        await expect(assetDetailsPage.hostOverviewTab.alertsContent).toBeVisible();
      });

      await test.step('renders services section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.servicesSection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.servicesSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.hostOverviewTab.servicesSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.hostOverviewTab.servicesShowAllButton).toBeVisible();

        await expect(assetDetailsPage.hostOverviewTab.servicesContainer).toBeVisible();

        await assetDetailsPage.hostOverviewTab.servicesSectionCollapsible.click();
        await expect(assetDetailsPage.hostOverviewTab.servicesSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.hostOverviewTab.servicesSectionGroup).toHaveAttribute(
          'inert'
        );
      });

      await test.step('renders metrics section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsSection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.hostOverviewTab.metricsSectionGroup).not.toHaveAttribute(
          'inert'
        );

        await expect(assetDetailsPage.hostOverviewTab.metricsCpuSection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuSectionTitle).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuShowAllButton).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuNormalizedLoadChart).toBeVisible();

        await expect(assetDetailsPage.hostOverviewTab.metricsMemorySection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsMemorySectionTitle).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsMemoryShowAllButton).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsMemoryUsageChart).toBeVisible();

        await expect(assetDetailsPage.hostOverviewTab.metricsNetworkSection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsNetworkSectionTitle).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsNetworkShowAllButton).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsNetworkChart).toBeVisible();

        await expect(assetDetailsPage.hostOverviewTab.metricsDiskSection).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskSectionTitle).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskShowAllButton).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskIOChart).toBeVisible();

        await assetDetailsPage.hostOverviewTab.metricsSectionCollapsible.click();
        await expect(assetDetailsPage.hostOverviewTab.metricsSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.hostOverviewTab.metricsSectionGroup).toHaveAttribute('inert');
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
        await assetDetailsPage.metadataTab.pinField(HOSTS_METADATA_FIELD);
        const pinButtons = assetDetailsPage.metadataTab.getPinButtonsForField(HOSTS_METADATA_FIELD);
        await expect(pinButtons.pin).toBeHidden();
        await expect(pinButtons.unpin).toBeVisible();
      });

      await test.step('unpin a metadata field row', async () => {
        await assetDetailsPage.metadataTab.unpinField(HOSTS_METADATA_FIELD);
        const pinButtons = assetDetailsPage.metadataTab.getPinButtonsForField(HOSTS_METADATA_FIELD);
        await expect(pinButtons.pin).toBeVisible();
        await expect(pinButtons.unpin).toBeHidden();
      });

      await test.step('filter fields via search bar', async () => {
        await assetDetailsPage.metadataTab.filterField(HOSTS_METADATA_FIELD);
        await expect(assetDetailsPage.metadataTab.tableRows).toHaveCount(1);
        const row = assetDetailsPage.metadataTab.getRowForField(HOSTS_METADATA_FIELD);
        await expect(row).toBeVisible();
      });
    });

    test('Metadata Tab - Is accessible from overview tab section show all', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      await assetDetailsPage.hostOverviewTab.metadataShowAllButton.click();
      await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
    });

    test('Metrics Tab', async ({ pageObjects: { assetDetailsPage } }) => {
      await test.step('accessible from default tab', async () => {
        await expect(assetDetailsPage.hostMetricsTab.tab).toHaveAttribute('aria-selected', 'false');
        await assetDetailsPage.hostMetricsTab.clickTab();
        await expect(assetDetailsPage.hostMetricsTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('quick access menu renders expected content', async () => {
        const quickAccessItems: MetricsTabQuickAccessItem[] = [
          'CPU',
          'Memory',
          'Network',
          'Disk',
          'Log Rate',
        ];

        await expect(assetDetailsPage.hostMetricsTab.quickAccessItems).toHaveText(quickAccessItems);
      });

      await test.step('navigate to CPU metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.hostMetricsTab.clickQuickAccessItem('CPU');
        await expect(assetDetailsPage.hostMetricsTab.cpuSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.hostMetricsTab.cpuUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostMetricsTab.cpuUsageBreakdownChart).toBeVisible();
        await expect(assetDetailsPage.hostMetricsTab.cpuNormalizedLoadChart).toBeVisible();
        await expect(assetDetailsPage.hostMetricsTab.cpuLoadBreakdownChart).toBeVisible();
      });

      await test.step('navigate to Memory metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.hostMetricsTab.clickQuickAccessItem('Memory');
        await expect(assetDetailsPage.hostMetricsTab.memorySectionTitle).toBeInViewport();

        await expect(assetDetailsPage.hostMetricsTab.memoryUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostMetricsTab.memoryUsageBreakdownChart).toBeVisible();
      });

      await test.step('navigate to Network metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.hostMetricsTab.clickQuickAccessItem('Network');
        await expect(assetDetailsPage.hostMetricsTab.networkSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.hostMetricsTab.networkChart).toBeVisible();
      });

      await test.step('navigate to Disk metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.hostMetricsTab.clickQuickAccessItem('Disk');
        await expect(assetDetailsPage.hostMetricsTab.diskSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.hostMetricsTab.diskUsageChart).toBeVisible();
        await expect(assetDetailsPage.hostMetricsTab.diskIOChart).toBeVisible();
        await expect(assetDetailsPage.hostMetricsTab.diskThroughputChart).toBeVisible();
      });

      await test.step('navigate to Log metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.hostMetricsTab.clickQuickAccessItem('Log Rate');
        await expect(assetDetailsPage.hostMetricsTab.logSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.hostMetricsTab.logRateChart).toBeVisible();
      });
    });

    test('Metrics Tab - Sections are accessible from overview tab section show all', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      const goBackToOverviewTab = async () => {
        await assetDetailsPage.hostOverviewTab.tab.click();
        await expect(assetDetailsPage.hostOverviewTab.tab).toHaveAttribute('aria-selected', 'true');
      };

      await test.step('cpu section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsCpuUsageChart).toBeVisible();
        await assetDetailsPage.hostOverviewTab.metricsCpuShowAllButton.click();
        await expect(assetDetailsPage.hostMetricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.hostMetricsTab.cpuSectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('memory section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsMemoryUsageChart).toBeVisible();
        await assetDetailsPage.hostOverviewTab.metricsMemoryShowAllButton.click();
        await expect(assetDetailsPage.hostMetricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.hostMetricsTab.memorySectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('network section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsNetworkChart).toBeVisible();
        await assetDetailsPage.hostOverviewTab.metricsNetworkShowAllButton.click();
        await expect(assetDetailsPage.hostMetricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.hostMetricsTab.networkSectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('disk section', async () => {
        await expect(assetDetailsPage.hostOverviewTab.metricsDiskUsageChart).toBeVisible();
        await assetDetailsPage.hostOverviewTab.metricsDiskShowAllButton.click();
        await expect(assetDetailsPage.hostMetricsTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.hostMetricsTab.diskSectionTitle).toBeInViewport();
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
        const totalDocumentsText =
          await assetDetailsPage.logsTag.tableTotalDocumentsLabel.textContent();

        await assetDetailsPage.logsTag.filterTable(`"${LOG_LEVELS[0].message}"`);
        await expect(assetDetailsPage.logsTag.tableTotalDocumentsLabel).not.toHaveText(
          totalDocumentsText!
        );

        const discoverQuery = `(host.name: ${HOST1_NAME}) and ("${LOG_LEVELS[0].message}")`;

        await assetDetailsPage.logsTag.openInDiscoverButton.click();

        // Giving extended timeout to ensure Discover has enough time to load the page
        await expect(page.getByTestId('queryInput')).toHaveValue(discoverQuery, {
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });

    test('Open as page and return to flyout', async ({
      page,
      pageObjects: { assetDetailsPage },
    }) => {
      await test.step('go to metadata tab', async () => {
        await assetDetailsPage.metadataTab.clickTab();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('open asset details as page keeping the selected tab', async () => {
        await assetDetailsPage.openAsPageButton.click();

        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metadataTab.searchBar).toBeVisible();
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();

        const url = new URL(page.url());
        expect(url.pathname).toBe(`/app/metrics/detail/host/${encodeURIComponent(HOST1_NAME)}`);
      });

      await test.step('return to flyout from asset details page', async () => {
        await assetDetailsPage.returnButton.click();
        await expect(
          page.getByRole('dialog').getByRole('heading', { name: HOST1_NAME })
        ).toBeVisible();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metadataTab.searchBar).toBeVisible();
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();
      });
    });
  }
);
