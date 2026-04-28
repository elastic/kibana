/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { AssetDetailsPageTabName } from './asset_details_tab';
import { AssetDetailsTab } from './asset_details_tab';

export type MetricsTabQuickAccessItem = 'CPU' | 'Memory' | 'Network' | 'Disk' | 'Log Rate';

export class MetricsTab extends AssetDetailsTab {
  public readonly tabName: AssetDetailsPageTabName = 'Metrics';
  public readonly tab: Locator;

  public readonly chartsContent: Locator;

  public readonly quickAccessItems: Locator;

  public readonly cpuSection: Locator;
  public readonly cpuSectionTitle: Locator;
  public readonly cpuUsageChart: Locator;
  public readonly cpuUsageBreakdownChart: Locator;
  public readonly cpuNormalizedLoadChart: Locator;
  public readonly cpuLoadBreakdownChart: Locator;

  public readonly memorySection: Locator;
  public readonly memorySectionTitle: Locator;
  public readonly memoryUsageChart: Locator;
  public readonly memoryUsageBreakdownChart: Locator;

  public readonly networkSection: Locator;
  public readonly networkSectionTitle: Locator;
  public readonly networkChart: Locator;

  public readonly diskSection: Locator;
  public readonly diskSectionTitle: Locator;
  public readonly diskUsageChart: Locator;
  public readonly diskIOChart: Locator;
  public readonly diskThroughputChart: Locator;

  public readonly logSection: Locator;
  public readonly logSectionTitle: Locator;
  public readonly logRateChart: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, private readonly assetType: 'Host' | 'Docker') {
    super(page, kbnUrl);
    this.tab = this.page.getByTestId(`infraAssetDetails${this.tabName}Tab`);

    this.chartsContent = this.page.getByTestId('infraAssetDetailsMetricChartsContent');

    this.quickAccessItems = this.chartsContent
      .getByRole('list')
      .filter({ has: this.page.getByTestId('infraMetricsQuickAccessItemcpu') })
      .locator('li');

    this.cpuSection = this.chartsContent.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectioncpu`
    );
    this.cpuSectionTitle = this.cpuSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectioncpuTitle`
    );
    this.cpuUsageChart = this.cpuSection.getByTestId('infraAssetDetailsMetricChartcpuUsage');
    this.cpuUsageBreakdownChart = this.cpuSection.getByTestId(
      'infraAssetDetailsMetricChartcpuUsageBreakdown'
    );
    this.cpuNormalizedLoadChart = this.cpuSection.getByTestId(
      'infraAssetDetailsMetricChartnormalizedLoad1m'
    );
    this.cpuLoadBreakdownChart = this.cpuSection.getByTestId(
      'infraAssetDetailsMetricChartloadBreakdown'
    );

    this.memorySection = this.chartsContent.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionmemory`
    );
    this.memorySectionTitle = this.memorySection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionmemoryTitle`
    );
    this.memoryUsageChart = this.memorySection.getByTestId(
      'infraAssetDetailsMetricChartmemoryUsage'
    );
    this.memoryUsageBreakdownChart = this.memorySection.getByTestId(
      'infraAssetDetailsMetricChartmemoryUsageBreakdown'
    );

    this.networkSection = this.chartsContent.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionnetwork`
    );
    this.networkSectionTitle = this.networkSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionnetworkTitle`
    );
    this.networkChart = this.networkSection.getByTestId('infraAssetDetailsMetricChartrxTx');

    this.diskSection = this.chartsContent.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectiondisk`
    );
    this.diskSectionTitle = this.diskSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectiondiskTitle`
    );
    this.diskUsageChart = this.diskSection.getByTestId(
      'infraAssetDetailsMetricChartdiskUsageByMountPoint'
    );
    this.diskIOChart = this.diskSection.getByTestId('infraAssetDetailsMetricChartdiskIOReadWrite');
    this.diskThroughputChart = this.diskSection.getByTestId(
      'infraAssetDetailsMetricChartdiskThroughputReadWrite'
    );

    this.logSection = this.chartsContent.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionlog`
    );
    this.logSectionTitle = this.logSection.getByTestId(
      `infraAssetDetails${this.assetType}ChartsSectionlogTitle`
    );
    this.logRateChart = this.logSection.getByTestId('infraAssetDetailsMetricChartlogRate');
  }

  public async clickQuickAccessItem(itemName: MetricsTabQuickAccessItem) {
    const item = this.quickAccessItems.filter({ hasText: itemName });
    await item.click();
  }
}
