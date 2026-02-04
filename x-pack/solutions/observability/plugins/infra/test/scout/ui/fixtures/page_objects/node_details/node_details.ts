/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import rison from '@kbn/rison';
import { type KibanaUrl, type Locator, type ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { EXTENDED_TIMEOUT } from '../../constants';

interface QueryParams {
  name?: string;
  alertMetric?: string;
  from?: Moment;
  to?: Moment;
}

export class NodeDetailsPage {
  // Tab locators
  public readonly overviewTab: Locator;
  public readonly metadataTab: Locator;
  public readonly metricsTab: Locator;
  public readonly processesTab: Locator;
  public readonly logsTab: Locator;
  public readonly anomaliesTab: Locator;
  public readonly profilingTab: Locator;
  public readonly osqueryTab: Locator;

  // Overview tab elements
  public readonly overviewTabContent: Locator;
  public readonly alertsTitle: Locator;
  public readonly alertsCollapsible: Locator;
  public readonly metadataCollapsible: Locator;
  public readonly servicesCollapsible: Locator;
  public readonly metricsCollapsible: Locator;
  public readonly cpuProfilingPrompt: Locator;
  public readonly overviewLinkToAlerts: Locator;
  public readonly overviewOpenAlertsFlyout: Locator;

  // Metadata tab elements
  public readonly metadataTable: Locator;
  public readonly metadataAddPin: Locator;
  public readonly metadataRemovePin: Locator;
  public readonly metadataSearchInput: Locator;

  // Metrics tab elements
  public readonly metricsTabContent: Locator;

  // Processes tab elements
  public readonly processesTabContent: Locator;
  public readonly processesTable: Locator;
  public readonly processesSearchInput: Locator;
  public readonly processesSearchInputError: Locator;
  public readonly processRowButton: Locator;

  // Logs tab elements
  public readonly logsTabContent: Locator;
  public readonly logsSearchInput: Locator;

  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    // Tabs
    this.overviewTab = this.page.testSubj.locator('infraAssetDetailsOverviewTab');
    this.metadataTab = this.page.testSubj.locator('infraAssetDetailsMetadataTab');
    this.metricsTab = this.page.testSubj.locator('infraAssetDetailsMetricsTab');
    this.processesTab = this.page.testSubj.locator('infraAssetDetailsProcessesTab');
    this.logsTab = this.page.testSubj.locator('infraAssetDetailsLogsTab');
    this.anomaliesTab = this.page.testSubj.locator('infraAssetDetailsAnomaliesTab');
    this.profilingTab = this.page.testSubj.locator('infraAssetDetailsProfilingTab');
    this.osqueryTab = this.page.testSubj.locator('infraAssetDetailsOsqueryTab');

    // Overview tab
    this.overviewTabContent = this.page.testSubj.locator('infraAssetDetailsOverviewTabContent');
    this.alertsTitle = this.page.testSubj.locator('infraAssetDetailsAlertsTitle');
    this.alertsCollapsible = this.page.testSubj.locator('infraAssetDetailsAlertsCollapsible');
    this.metadataCollapsible = this.page.testSubj.locator('infraAssetDetailsMetadataCollapsible');
    this.servicesCollapsible = this.page.testSubj.locator('infraAssetDetailsServicesCollapsible');
    this.metricsCollapsible = this.page.testSubj.locator('infraAssetDetailsMetricsCollapsible');
    this.cpuProfilingPrompt = this.page.testSubj.locator('infraAssetDetailsCPUProfilingPrompt');
    this.overviewLinkToAlerts = this.page.testSubj.locator(
      'infraAssetDetailsAlertsTabAlertsShowAllButton'
    );
    this.overviewOpenAlertsFlyout = this.page.testSubj.locator(
      'infraAssetDetailsAlertsTabCreateAlertsRuleButton'
    );

    // Metadata tab
    this.metadataTable = this.page.testSubj.locator('infraAssetDetailsMetadataTable');
    this.metadataAddPin = this.page.testSubj.locator('infraAssetDetailsMetadataAddPin');
    this.metadataRemovePin = this.page.testSubj.locator('infraAssetDetailsMetadataRemovePin');
    this.metadataSearchInput = this.page.testSubj.locator(
      'infraAssetDetailsMetadataSearchBarInput'
    );

    // Metrics tab
    this.metricsTabContent = this.page.testSubj.locator('infraAssetDetailsMetricsTabContent');

    // Processes tab
    this.processesTabContent = this.page.testSubj.locator('infraAssetDetailsProcessesTabContent');
    this.processesTable = this.page.testSubj.locator('infraAssetDetailsProcessesTable');
    this.processesSearchInput = this.page.testSubj.locator(
      'infraAssetDetailsProcessesSearchBarInput'
    );
    this.processesSearchInputError = this.page.testSubj.locator(
      'infraAssetDetailsProcessesSearchInputError'
    );
    this.processRowButton = this.page.testSubj.locator('infraProcessRowButton');

    // Logs tab
    this.logsTabContent = this.page.testSubj.locator('infraAssetDetailsLogsTabContent');
    this.logsSearchInput = this.page.testSubj.locator('infraAssetDetailsLogsTabFieldSearch');
  }

  private getNodeDetailsUrl(queryParams?: QueryParams): string {
    if (!queryParams) {
      return '';
    }

    const { from, to, name, alertMetric } = queryParams;
    const assetDetails: Record<string, unknown> = {};

    // Add dateRange if from and to are provided
    if (from && to) {
      assetDetails.dateRange = {
        from: from.toISOString(),
        to: to.toISOString(),
      };
    }

    // Add other fields at the top level
    if (name) {
      assetDetails.name = name;
    }

    if (alertMetric) {
      assetDetails.alertMetric = alertMetric;
    }

    // Set defaults
    assetDetails.preferredSchema = 'semconv';
    assetDetails.tabId = 'overview';

    return rison.encodeUnknown(assetDetails) || '';
  }

  public async goToPage(
    entityId: string,
    entityType: 'host' | 'container',
    queryParams?: QueryParams
  ) {
    const assetDetailsParam = this.getNodeDetailsUrl(queryParams);

    const url = `${this.kbnUrl.app(
      'metrics'
    )}/detail/${entityType}/${entityId}?assetDetails=${assetDetailsParam}`;
    await this.page.goto(url);
    // Wait for the page to load - check for overview tab or any tab to be visible
    await this.overviewTab.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  public async refreshPage() {
    await this.page.reload();
    await this.overviewTab.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  // Tab navigation
  public async clickOverviewTab() {
    await this.overviewTab.click();
  }

  public async clickMetadataTab() {
    await this.metadataTab.click();
  }

  public async clickMetricsTab() {
    await this.metricsTab.click();
  }

  public async clickProcessesTab() {
    await this.processesTab.click();
  }

  public async clickLogsTab() {
    await this.logsTab.click();
  }

  public async clickAnomaliesTab() {
    await this.anomaliesTab.click();
  }

  public async clickProfilingTab() {
    await this.profilingTab.click();
  }

  public async clickOsqueryTab() {
    await this.osqueryTab.click();
  }

  // Overview tab methods
  public async getKPITileValue(type: string): Promise<string> {
    const element = this.page.testSubj.locator(`infraAssetDetailsKPI${type}`);
    const valueElement = element.locator('.echMetricText__value');
    return (await valueElement.getAttribute('title')) || '';
  }

  public async getOverviewTabHostMetricCharts(metric: string) {
    await this.page.testSubj.locator(`infraAssetDetailsHostChartsSection${metric}`).waitFor();
    const section = this.overviewTabContent.locator(
      `[data-test-subj="infraAssetDetailsHostChartsSection${metric}"]`
    );
    return section.locator(
      '[data-test-subj*="infraAssetDetailsMetricChart"]:not([data-test-subj*="hover-actions"])'
    );
  }

  public async getOverviewTabDockerMetricCharts(metric: string) {
    await this.page.testSubj.locator(`infraAssetDetailsDockerChartsSection${metric}`).waitFor();
    const section = this.overviewTabContent.locator(
      `[data-test-subj="infraAssetDetailsDockerChartsSection${metric}"]`
    );
    return section.locator(
      '[data-test-subj*="infraAssetDetailsMetricChart"]:not([data-test-subj*="hover-actions"])'
    );
  }

  public async getOverviewTabKubernetesMetricCharts() {
    const section = this.overviewTabContent.locator(
      '[data-test-subj="infraAssetDetailsKubernetesChartsSection"]'
    );
    return section.locator(
      '[data-test-subj*="infraAssetDetailsMetricChart"]:not([data-test-subj*="hover-actions"])'
    );
  }

  public async waitForChartsToLoad(timeout: number = EXTENDED_TIMEOUT) {
    const chartLocator = this.page.testSubj.locator('^infraAssetDetailsHostCharts');

    await expect
      .poll(
        async () => {
          return await chartLocator.count();
        },
        {
          timeout,
        }
      )
      .toBeGreaterThanOrEqual(1);
  }

  public async clickAlertsSectionCollapsible() {
    await this.alertsCollapsible.click();
  }

  public async alertsSectionClosedContentWithAlertsExists(): Promise<boolean> {
    return await this.page.testSubj
      .locator('infraAssetDetailsAlertsClosedContentWithAlerts')
      .isVisible()
      .catch(() => false);
  }

  public async alertsSectionClosedContentNoAlertsExists(): Promise<boolean> {
    return await this.page.testSubj
      .locator('infraAssetDetailsAlertsClosedContentNoAlerts')
      .isVisible()
      .catch(() => false);
  }

  // Metadata tab methods
  public async pinMetadataField() {
    await this.metadataAddPin.click();
  }

  public async unpinMetadataField() {
    await this.metadataRemovePin.click();
  }

  public async searchMetadata(searchTerm: string) {
    await this.metadataSearchInput.fill(searchTerm);
    await expect(this.metadataSearchInput).toHaveValue(searchTerm);
    await this.metadataSearchInput.press('Enter');
  }

  public async getMetadataSearchValue(): Promise<string> {
    return (await this.metadataSearchInput.inputValue()) || '';
  }

  public async clearMetadataSearch() {
    await this.metadataSearchInput.clear();
  }

  // Metrics tab methods
  public async getMetricsTabHostCharts(metric: string) {
    await this.page.testSubj.locator(`infraAssetDetailsHostChartsSection${metric}`).waitFor();
    const section = this.metricsTabContent.locator(
      `[data-test-subj="infraAssetDetailsHostChartsSection${metric}"]`
    );
    return section.locator(
      '[data-test-subj*="infraAssetDetailsMetricChart"]:not([data-test-subj*="hover-actions"])'
    );
  }

  public async getMetricsTabKubernetesCharts() {
    const section = this.metricsTabContent.locator(
      '[data-test-subj="infraAssetDetailsKubernetesChartsSection"]'
    );
    return section.locator(
      '[data-test-subj*="infraAssetDetailsMetricChart"]:not([data-test-subj*="hover-actions"])'
    );
  }

  public async getMetricsTabDockerCharts(metric: string) {
    await this.page.testSubj.locator(`infraAssetDetailsDockerChartsSection${metric}`).waitFor();
    const section = this.metricsTabContent.locator(
      `[data-test-subj="infraAssetDetailsDockerChartsSection${metric}"]`
    );
    return section.locator(
      '[data-test-subj*="infraAssetDetailsMetricChart"]:not([data-test-subj*="hover-actions"])'
    );
  }

  public async expectChartsCount(dataTestSubj: string, expectedCount: number) {
    const charts = this.page.testSubj.locator(`^${dataTestSubj}`);
    await expect(charts).toHaveCount(expectedCount);
  }

  public async clickQuickAccessItem(metric: string) {
    await this.page.testSubj.locator(`infraMetricsQuickAccessItem${metric}`).click();
  }

  // Processes tab methods
  public async searchProcesses(searchTerm: string) {
    await this.processesSearchInput.fill(searchTerm);
  }

  public async getProcessesSearchValue(): Promise<string> {
    return (await this.processesSearchInput.inputValue()) || '';
  }

  public async clearProcessesSearch() {
    await this.processesSearchInput.clear();
  }

  // Logs tab methods
  public async searchLogs(searchTerm: string) {
    await this.logsSearchInput.fill(searchTerm);
  }

  public async getLogsSearchValue(): Promise<string> {
    return (await this.logsSearchInput.inputValue()) || '';
  }

  public async clearLogsSearch() {
    await this.logsSearchInput.clear();
  }

  // Callouts
  public async legacyMetricAlertCalloutExists(): Promise<boolean> {
    return await this.page.testSubj
      .locator('infraAssetDetailsLegacyMetricAlertCallout')
      .isVisible();
  }
}
