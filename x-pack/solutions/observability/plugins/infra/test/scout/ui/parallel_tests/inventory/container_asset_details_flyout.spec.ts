/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
  CONTAINER_COUNT,
  CONTAINER_IDS,
  CONTAINER_METADATA_FIELD,
  CONTAINER_NAMES,
  DATE_WITH_DOCKER_DATA_TIMESTAMP,
  DEFAULT_CONTAINERS_INVENTORY_VIEW_NAME,
  EXTENDED_TIMEOUT,
  LOG_LEVELS,
} from '../../fixtures/constants';
import type { MetricsTabQuickAccessItem } from '../../fixtures/page_objects/asset_details/metrics_tab';

const CONTAINER_NAME = CONTAINER_NAMES[CONTAINER_COUNT - 1];
const CONTAINER_ID = CONTAINER_IDS[CONTAINER_COUNT - 1];

test.describe(
  'Infrastructure Inventory - Container Asset Details Flyout',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    let savedViewId: string = '';

    test.beforeAll(async ({ apiServices: { inventoryViews } }) => {
      const createResult = await inventoryViews.create({
        ...BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES,
        name: DEFAULT_CONTAINERS_INVENTORY_VIEW_NAME,
        nodeType: 'container',
        time: DATE_WITH_DOCKER_DATA_TIMESTAMP,
        metric: {
          type: 'cpu',
        },
      });

      savedViewId = createResult.id;
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPageWithSavedViewAndAssetDetailsFlyout({
        savedViewId,
        assetId: CONTAINER_ID,
        entityType: 'container',
      });
    });

    test.afterAll(async ({ apiServices: { inventoryViews } }) => {
      await inventoryViews.deleteById(savedViewId);
    });

    test('Overview Tab', async ({ pageObjects: { assetDetailsPage } }) => {
      await test.step('is selected as default tab', async () => {
        await expect(assetDetailsPage.dockerOverviewTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
      });

      await test.step('renders KPI charts', async () => {
        await expect(
          assetDetailsPage.dockerOverviewTab.kpiCpuUsageChart.getByRole('heading', {
            name: 'CPU Usage',
          })
        ).toBeVisible();
        await expect(
          assetDetailsPage.dockerOverviewTab.kpiMemoryUsageChart.getByRole('heading', {
            name: 'Memory Usage',
          })
        ).toBeVisible();
      });

      await test.step('renders metadata section', async () => {
        await expect(assetDetailsPage.dockerOverviewTab.metadataSection).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metadataSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.dockerOverviewTab.metadataSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.dockerOverviewTab.metadataShowAllButton).toBeVisible();

        await expect(assetDetailsPage.dockerOverviewTab.metadataSummaryItems).toHaveCount(3);
        await expect(
          assetDetailsPage.dockerOverviewTab.metadataSummaryItems.filter({
            hasText: 'Container ID',
          })
        ).toBeVisible();
        await expect(
          assetDetailsPage.dockerOverviewTab.metadataSummaryItems.filter({
            hasText: 'Container image name',
          })
        ).toBeVisible();
        await expect(
          assetDetailsPage.dockerOverviewTab.metadataSummaryItems.filter({
            hasText: 'Host name',
          })
        ).toBeVisible();

        await assetDetailsPage.dockerOverviewTab.metadataSectionCollapsible.click();
        await expect(assetDetailsPage.dockerOverviewTab.metadataSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.dockerOverviewTab.metadataSectionGroup).toHaveAttribute(
          'inert'
        );
      });

      await test.step('renders alert section', async () => {
        await expect(assetDetailsPage.dockerOverviewTab.alertsSection).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.alertsSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.dockerOverviewTab.alertsSectionGroup).toHaveAttribute(
          'inert'
        );
        await assetDetailsPage.dockerOverviewTab.alertsSectionCollapsible.click();
        await expect(assetDetailsPage.dockerOverviewTab.alertsSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.dockerOverviewTab.alertsSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.dockerOverviewTab.alertsShowAllButton).toBeVisible();
        await expect(assetDetailsPage.hostOverviewTab.alertsCreateRuleButton).toBeVisible();

        await expect(assetDetailsPage.dockerOverviewTab.alertsContent).toBeVisible();
      });

      await test.step('renders metrics section', async () => {
        await expect(assetDetailsPage.dockerOverviewTab.metricsSection).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsSection).toHaveAttribute(
          'data-section-state',
          'open'
        );
        await expect(assetDetailsPage.dockerOverviewTab.metricsSectionGroup).not.toHaveAttribute(
          'inert'
        );
        await expect(assetDetailsPage.dockerOverviewTab.metricsCpuSection).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsCpuSectionTitle).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsCpuShowAllButton).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsCpuUsageChart).toBeVisible();

        await expect(assetDetailsPage.dockerOverviewTab.metricsMemorySection).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsMemorySectionTitle).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsMemoryShowAllButton).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsMemoryUsageChart).toBeVisible();

        await expect(assetDetailsPage.dockerOverviewTab.metricsNetworkSection).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsNetworkSectionTitle).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsNetworkShowAllButton).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsNetworkChart).toBeVisible();

        await expect(assetDetailsPage.dockerOverviewTab.metricsDiskSection).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsDiskSectionTitle).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsDiskShowAllButton).toBeVisible();
        await expect(assetDetailsPage.dockerOverviewTab.metricsDiskIOChart).toBeVisible();

        await assetDetailsPage.dockerOverviewTab.metricsSectionCollapsible.click();
        await expect(assetDetailsPage.dockerOverviewTab.metricsSection).toHaveAttribute(
          'data-section-state',
          'closed'
        );
        await expect(assetDetailsPage.dockerOverviewTab.metricsSectionGroup).toHaveAttribute(
          'inert'
        );
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
        await assetDetailsPage.metadataTab.pinField(CONTAINER_METADATA_FIELD);
        const pinButtons =
          assetDetailsPage.metadataTab.getPinButtonsForField(CONTAINER_METADATA_FIELD);
        await expect(pinButtons.pin).toBeHidden();
        await expect(pinButtons.unpin).toBeVisible();
      });

      await test.step('unpin a metadata field row', async () => {
        await assetDetailsPage.metadataTab.unpinField(CONTAINER_METADATA_FIELD);
        const pinButtons =
          assetDetailsPage.metadataTab.getPinButtonsForField(CONTAINER_METADATA_FIELD);
        await expect(pinButtons.pin).toBeVisible();
        await expect(pinButtons.unpin).toBeHidden();
      });

      await test.step('filter fields via search bar', async () => {
        await assetDetailsPage.metadataTab.filterField(CONTAINER_METADATA_FIELD);
        await expect(assetDetailsPage.metadataTab.tableRows).toHaveCount(1);
        const row = assetDetailsPage.metadataTab.getRowForField(CONTAINER_METADATA_FIELD);
        await expect(row).toBeVisible();
      });
    });

    test('Metadata Tab - Is accessible from overview tab section show all', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      await assetDetailsPage.dockerOverviewTab.metadataShowAllButton.click();
      await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
    });

    test('Metrics Tab', async ({ pageObjects: { assetDetailsPage } }) => {
      await test.step('accessible from default tab', async () => {
        await expect(assetDetailsPage.dockerMetricsTab.tab).toHaveAttribute(
          'aria-selected',
          'false'
        );
        await assetDetailsPage.dockerMetricsTab.clickTab();
        await expect(assetDetailsPage.dockerMetricsTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
      });

      await test.step('quick access menu renders expected content', async () => {
        const quickAccessItems: MetricsTabQuickAccessItem[] = ['CPU', 'Memory', 'Network', 'Disk'];

        await expect(assetDetailsPage.dockerMetricsTab.quickAccessItems).toHaveText(
          quickAccessItems
        );
      });

      await test.step('navigate to CPU metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.dockerMetricsTab.clickQuickAccessItem('CPU');
        await expect(assetDetailsPage.dockerMetricsTab.cpuSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.dockerMetricsTab.cpuUsageChart).toBeVisible();
      });

      await test.step('navigate to Memory metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.dockerMetricsTab.clickQuickAccessItem('Memory');
        await expect(assetDetailsPage.dockerMetricsTab.memorySectionTitle).toBeInViewport();

        await expect(assetDetailsPage.dockerMetricsTab.memoryUsageChart).toBeVisible();
      });

      await test.step('navigate to Network metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.dockerMetricsTab.clickQuickAccessItem('Network');
        await expect(assetDetailsPage.dockerMetricsTab.networkSectionTitle).toBeInViewport();
        await expect(assetDetailsPage.dockerMetricsTab.networkChart).toBeVisible();
      });

      await test.step('navigate to Disk metrics via quick access menu and render expected content', async () => {
        await assetDetailsPage.dockerMetricsTab.clickQuickAccessItem('Disk');
        await expect(assetDetailsPage.dockerMetricsTab.diskSectionTitle).toBeInViewport();

        await expect(assetDetailsPage.dockerMetricsTab.diskIOChart).toBeVisible();
      });
    });

    test('Metrics Tab - Sections are accessible from overview tab section show all', async ({
      pageObjects: { assetDetailsPage },
    }) => {
      const goBackToOverviewTab = async () => {
        await assetDetailsPage.dockerOverviewTab.tab.click();
        await expect(assetDetailsPage.dockerOverviewTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
      };

      await test.step('cpu section', async () => {
        await assetDetailsPage.dockerOverviewTab.metricsCpuShowAllButton.click();
        await expect(assetDetailsPage.dockerMetricsTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
        await expect(assetDetailsPage.dockerMetricsTab.cpuSectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('memory section', async () => {
        await assetDetailsPage.dockerOverviewTab.metricsMemoryShowAllButton.click();
        await expect(assetDetailsPage.dockerMetricsTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
        await expect(assetDetailsPage.dockerMetricsTab.memorySectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('network section', async () => {
        await assetDetailsPage.dockerOverviewTab.metricsNetworkShowAllButton.click();
        await expect(assetDetailsPage.dockerMetricsTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
        await expect(assetDetailsPage.dockerMetricsTab.networkSectionTitle).toBeInViewport();
        await goBackToOverviewTab();
      });

      await test.step('disk section', async () => {
        await assetDetailsPage.dockerOverviewTab.metricsDiskShowAllButton.click();
        await expect(assetDetailsPage.dockerMetricsTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
        await expect(assetDetailsPage.dockerMetricsTab.diskSectionTitle).toBeInViewport();
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

        const discoverQuery = `(container.id: ${CONTAINER_ID}) and ("${LOG_LEVELS[0].message}")`;

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
        expect(url.pathname).toBe(
          `/app/metrics/detail/container/${encodeURIComponent(CONTAINER_ID)}`
        );
      });

      await test.step('return to flyout from asset details page', async () => {
        await assetDetailsPage.returnButton.click();
        await expect(
          page.getByRole('dialog').getByRole('heading', { name: CONTAINER_NAME })
        ).toBeVisible();
        await expect(assetDetailsPage.metadataTab.tab).toHaveAttribute('aria-selected', 'true');
        await expect(assetDetailsPage.metadataTab.searchBar).toBeVisible();
        await expect(assetDetailsPage.metadataTab.table).toBeVisible();
      });
    });
  }
);
