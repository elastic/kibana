/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { AssetDetailsPageTabName } from './asset_details_tab';
import { AssetDetailsTab } from './asset_details_tab';
import { KPI_METRICS } from '../../constants';

export class OverviewTab extends AssetDetailsTab {
  public readonly tabName: AssetDetailsPageTabName = 'Overview';
  public readonly tab: Locator;

  public readonly kpiGrid: Locator;
  public readonly kpiCpuUsageChart: Locator;
  public readonly kpiNormalizedLoadChart: Locator;
  public readonly kpiMemoryUsageChart: Locator;
  public readonly kpiDiskUsageChart: Locator;

  public readonly metadataSection: Locator;
  public readonly metadataSectionCollapsible: Locator;
  public readonly metadataSectionGroup: Locator;
  public readonly metadataShowAllButton: Locator;
  public readonly metadataSummaryItems: Locator;

  public readonly alertsSection: Locator;
  public readonly alertsSectionCollapsible: Locator;
  public readonly alertsSectionGroup: Locator;
  public readonly alertsCreateRuleButton: Locator;
  public readonly alertsShowAllButton: Locator;
  public readonly alertsContent: Locator;

  public readonly servicesSection: Locator;
  public readonly servicesSectionCollapsible: Locator;
  public readonly servicesSectionGroup: Locator;
  public readonly servicesShowAllButton: Locator;
  public readonly servicesContainer: Locator;

  public readonly metricsSection: Locator;
  public readonly metricsSectionCollapsible: Locator;
  public readonly metricsSectionGroup: Locator;

  public readonly metricsCpuSection: Locator;
  public readonly metricsCpuSectionTitle: Locator;
  public readonly metricsCpuShowAllButton: Locator;
  public readonly metricsCpuUsageChart: Locator;
  public readonly metricsCpuNormalizedLoadChart: Locator;

  public readonly metricsMemorySection: Locator;
  public readonly metricsMemorySectionTitle: Locator;
  public readonly metricsMemoryShowAllButton: Locator;
  public readonly metricsMemoryUsageChart: Locator;

  public readonly metricsNetworkSection: Locator;
  public readonly metricsNetworkSectionTitle: Locator;
  public readonly metricsNetworkShowAllButton: Locator;
  public readonly metricsNetworkChart: Locator;

  public readonly metricsDiskSection: Locator;
  public readonly metricsDiskSectionTitle: Locator;
  public readonly metricsDiskShowAllButton: Locator;
  public readonly metricsDiskUsageChart: Locator;
  public readonly metricsDiskIOChart: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, private readonly assetType: 'Host' | 'Docker') {
    super(page, kbnUrl);
    this.tab = this.page.getByTestId(`infraAssetDetails${this.tabName}Tab`);

    this.kpiGrid = this.page.getByTestId('infraAssetDetailsKPIGrid');
    this.kpiCpuUsageChart = this.kpiGrid.getByTestId('infraAssetDetailsKPIcpuUsage');
    this.kpiNormalizedLoadChart = this.kpiGrid.getByTestId('infraAssetDetailsKPInormalizedLoad1m');
    this.kpiMemoryUsageChart = this.kpiGrid.getByTestId('infraAssetDetailsKPImemoryUsage');
    this.kpiDiskUsageChart = this.kpiGrid.getByTestId('infraAssetDetailsKPIdiskUsage');

    this.metadataSection = this.page
      .getByTestId('infraAssetDetailsCollapseExpandSection')
      .filter({ hasText: 'Metadata' });
    this.metadataSectionCollapsible = this.metadataSection.getByTestId(
      'infraAssetDetailsMetadataCollapsible'
    );
    this.metadataSectionGroup = this.metadataSection.getByRole('group');
    this.metadataShowAllButton = this.metadataSection.getByTestId(
      'infraAssetDetailsMetadataShowAllButton'
    );
    this.metadataSummaryItems = this.metadataSection.getByTestId('infraMetadataSummaryItem');

    this.alertsSection = this.page
      .getByTestId('infraAssetDetailsCollapseExpandSection')
      .filter({ hasText: 'Alerts' });
    this.alertsSectionCollapsible = this.alertsSection.getByTestId(
      'infraAssetDetailsAlertsCollapsible'
    );
    this.alertsSectionGroup = this.alertsSection
      .getByRole('group')
      .filter({ has: this.page.getByTestId('hostsView-alerts') });
    this.alertsCreateRuleButton = this.alertsSection.getByTestId(
      'infraAssetDetailsAlertsTabCreateAlertsRuleButton'
    );
    this.alertsShowAllButton = this.alertsSection.getByTestId(
      'infraAssetDetailsAlertsTabAlertsShowAllButton'
    );
    this.alertsContent = this.alertsSection.getByTestId('hostsView-alerts');

    this.servicesSection = this.page
      .getByTestId('infraAssetDetailsCollapseExpandSection')
      .filter({ hasText: 'Services' });
    this.servicesSectionCollapsible = this.servicesSection.getByTestId(
      'infraAssetDetailsServicesCollapsible'
    );
    this.servicesSectionGroup = this.servicesSection.getByRole('group');
    this.servicesShowAllButton = this.servicesSection.getByTestId(
      'infraAssetDetailsViewAPMShowAllServicesButton'
    );
    this.servicesContainer = this.servicesSection.getByTestId('infraAssetDetailsServicesContainer');

    this.metricsSection = this.page
      .getByTestId('infraAssetDetailsCollapseExpandSection')
      .filter({ hasText: 'Metrics' });
    this.metricsSectionCollapsible = this.metricsSection.getByTestId(
      'infraAssetDetailsMetricsCollapsible'
    );
    this.metricsSectionGroup = this.metricsSection.getByRole('group');

    this.metricsCpuSection = this.metricsSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectioncpu`
    );
    this.metricsCpuSectionTitle = this.metricsCpuSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectioncpuTitle`
    );
    this.metricsCpuShowAllButton = this.metricsCpuSection.getByRole('button', { name: 'Show all' });
    this.metricsCpuUsageChart = this.metricsCpuSection.getByTestId(
      'infraAssetDetailsMetricChartcpuUsage'
    );
    this.metricsCpuNormalizedLoadChart = this.metricsCpuSection.getByTestId(
      'infraAssetDetailsMetricChartnormalizedLoad1m'
    );

    this.metricsMemorySection = this.metricsSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionmemory`
    );
    this.metricsMemorySectionTitle = this.metricsMemorySection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionmemoryTitle`
    );
    this.metricsMemoryShowAllButton = this.metricsMemorySection.getByRole('button', {
      name: 'Show all',
    });
    this.metricsMemoryUsageChart = this.metricsMemorySection.getByTestId(
      'infraAssetDetailsMetricChartmemoryUsage'
    );

    this.metricsNetworkSection = this.metricsSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionnetwork`
    );
    this.metricsNetworkSectionTitle = this.metricsNetworkSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionnetworkTitle`
    );
    this.metricsNetworkShowAllButton = this.metricsNetworkSection.getByRole('button', {
      name: 'Show all',
    });
    this.metricsNetworkChart = this.metricsNetworkSection.getByTestId(
      'infraAssetDetailsMetricChartrxTx'
    );

    this.metricsDiskSection = this.metricsSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectiondisk`
    );
    this.metricsDiskSectionTitle = this.metricsDiskSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectiondiskTitle`
    );
    this.metricsDiskShowAllButton = this.metricsDiskSection.getByRole('button', {
      name: 'Show all',
    });
    this.metricsDiskUsageChart = this.metricsDiskSection.getByTestId(
      'infraAssetDetailsMetricChartdiskUsageByMountPoint'
    );
    this.metricsDiskIOChart = this.metricsDiskSection.getByTestId(
      'infraAssetDetailsMetricChartdiskIOReadWrite'
    );
  }

  private getKPIValueSelector(kpiPanelTestId: string): string {
    // Relative to `kpiGrid` — do not repeat `infraAssetDetailsKPIGrid` here or
    // Playwright will nest the selector twice (grid + grid + KPI).
    return `[data-test-subj="${kpiPanelTestId}"] .echMetricText__value`;
  }

  public getKPIValue(metric: string): Locator {
    const kpiPanelTestId = `infraAssetDetailsKPI${metric}`;
    return this.kpiGrid.locator(this.getKPIValueSelector(kpiPanelTestId));
  }

  private getKPILoadingIndicator(metric: string): Locator {
    return this.kpiGrid
      .getByTestId(`infraAssetDetailsKPI${metric}`)
      .getByRole('progressbar', { name: 'Loading' });
  }

  /**
   * Lens embeddable error panel shown when a KPI fails to render.
   * `data-test-subj="embeddableError"` is defined by the shared embeddable panel error component.
   */
  public getKPIEmbeddableError(metric: string): Locator {
    return this.kpiGrid.getByTestId(`infraAssetDetailsKPI${metric}`).getByTestId('embeddableError');
  }

  public async waitForKPILoadingToFinish(timeout?: number) {
    await this.getKPILoadingIndicator('cpuUsage').waitFor({ state: 'hidden', timeout });
  }

  private async waitForKPIValueTitleToBeSet(metric: string, timeout?: number) {
    await this.getKPIValue(metric).waitFor({ state: 'attached', timeout });
    const kpiPanelTestId = `infraAssetDetailsKPI${metric}`;
    const selector = `[data-test-subj="infraAssetDetailsKPIGrid"] ${this.getKPIValueSelector(
      kpiPanelTestId
    )}`;

    await this.page.waitForFunction(
      ({ sel }) => {
        const valueEl = document.querySelector(sel);
        const title = valueEl?.getAttribute('title');
        return typeof title === 'string' && title.trim().length > 0;
      },
      { sel: selector },
      { timeout }
    );
  }

  /**
   * Waits for all KPI Lens charts to finish rendering in parallel. The
   * `.echMetricText__value` element only appears once elastic-charts has
   * painted, so it's a sufficient single signal: it implies the outer panel
   * dropped `-loading`, Lens attributes resolved, and the chart didn't end up
   * in the `-error` state. Running the waits concurrently shares the budget
   * across all 4 charts instead of cascading it.
   */
  public async waitForKPIChartsToLoad(timeout?: number) {
    await this.kpiGrid.scrollIntoViewIfNeeded();

    await this.waitForKPILoadingToFinish(timeout);

    for (const metric of KPI_METRICS) {
      await this.waitForKPIValueTitleToBeSet(metric, timeout);
    }
  }
}
