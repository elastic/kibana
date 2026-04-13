/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

type PreferredSchema = 'ecs' | 'semconv' | null;

export class HostsPage {
  public readonly tableLoaded: Locator;
  public readonly tableLoading: Locator;
  public readonly tableRows: Locator;
  public readonly tableNoData: Locator;
  public readonly searchBar: Locator;
  public readonly querySubmitButton: Locator;
  public readonly errorCallout: Locator;

  public readonly metricsTab: Locator;
  public readonly logsTab: Locator;
  public readonly alertsTab: Locator;
  public readonly alertsTabCountBadge: Locator;

  public readonly logsSearchBar: Locator;
  public readonly excludeButton: Locator;

  public readonly kpiGrid: Locator;
  public readonly metricsChartsContainer: Locator;

  public readonly pageSizeSelector: Locator;
  public readonly selectedHostsFilterButton: Locator;
  public readonly addFilterButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.tableLoaded = this.page.getByTestId('hostsView-table-loaded');
    this.tableLoading = this.page.getByTestId('hostsView-table-loading');
    this.tableRows = this.page.getByTestId('hostsView-tableRow');
    this.tableNoData = this.page.getByTestId('hostsViewTableNoData');
    this.searchBar = this.page.getByTestId('queryInput');
    this.querySubmitButton = this.page.getByTestId('querySubmitButton');
    this.errorCallout = this.page.getByTestId('hostsViewErrorCallout');

    this.metricsTab = this.page.getByTestId('hostsView-tabs-metrics');
    this.logsTab = this.page.getByTestId('hostsView-tabs-logs');
    this.alertsTab = this.page.getByTestId('hostsView-tabs-alerts');
    this.alertsTabCountBadge = this.page.getByTestId('hostsView-tabs-alerts-count');

    this.logsSearchBar = this.page.getByTestId('hostsView-logs-text-field-search');
    this.excludeButton = this.page.getByTestId('optionsList__excludeResults');

    this.kpiGrid = this.page.getByTestId('hostsViewKPIGrid');
    this.metricsChartsContainer = this.page.getByTestId('hostsView-metricChart');

    this.pageSizeSelector = this.page.getByTestId('tablePaginationPopoverButton');
    this.selectedHostsFilterButton = this.page.getByTestId('hostsViewTableSelectHostsFilterButton');
    this.addFilterButton = this.page.getByTestId('hostsViewTableAddFilterButton');
  }

  private async waitForTableToLoad() {
    await this.tableLoaded.waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  public async filterByQueryBar(query: string) {
    await this.searchBar.clear();
    await this.searchBar.fill(query);
    await this.searchBar.press('Enter');
    await this.waitForTableToLoad();
  }

  public async submitQuery(query: string) {
    await this.searchBar.clear();
    await this.searchBar.fill(query);
    await this.querySubmitButton.click();
    await this.waitForTableToLoad();
  }

  public async goToPage({
    from,
    to,
    preferredSchema = null,
  }: {
    from: string;
    to: string;
    preferredSchema?: PreferredSchema;
  }) {
    const baseUrl = this.kbnUrl.app('metrics');
    const schemaPart =
      preferredSchema === null ? 'preferredSchema:!n' : `preferredSchema:${preferredSchema}`;
    const risonState = `(dateRange:(from:'${from}',to:'${to}'),filters:!(),limit:100,panelFilters:!(),${schemaPart},query:(language:kuery,query:''))`;
    await this.page.goto(`${baseUrl}/hosts?_a=${risonState}`);
    await this.waitForTableToLoad();
  }

  public async openHostFlyout(hostName: string) {
    const row = this.tableRows.filter({ hasText: hostName });
    await row.getByTestId('hostsView-flyout-button').click();
    await this.page
      .getByRole('dialog')
      .getByRole('heading', { name: hostName })
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  public async closeFlyout() {
    await this.page.getByTestId('euiFlyoutCloseButton').click();
    await this.waitForTableToLoad();
  }

  public async closeFlyoutWithEscape() {
    await this.page.keyboard.press('Escape');
    await this.waitForTableToLoad();
  }

  // Table helpers

  public getHostDetailLinks() {
    return this.page.getByTestId('hostsViewTableEntryTitleLink');
  }

  public async getRowData(row: Locator) {
    const cells = row.locator('[data-test-subj*="hostsView-tableRow-"]');
    const cellTexts = await cells.allInnerTexts();
    const [title, cpuUsage, normalizedLoad, memoryUsage, memoryFree, diskSpaceUsage, rx, tx] =
      cellTexts;
    return { title, cpuUsage, normalizedLoad, memoryUsage, memoryFree, diskSpaceUsage, rx, tx };
  }

  public async getRowDataWithAlerts(row: Locator) {
    const cells = row.locator('[data-test-subj*="hostsView-tableRow-"]');
    const cellTexts = await cells.allInnerTexts();
    const [
      alertsCount,
      title,
      cpuUsage,
      normalizedLoad,
      memoryUsage,
      memoryFree,
      diskSpaceUsage,
      rx,
      tx,
    ] = cellTexts;
    return {
      alertsCount,
      title,
      cpuUsage,
      normalizedLoad,
      memoryUsage,
      memoryFree,
      diskSpaceUsage,
      rx,
      tx,
    };
  }

  public async clickHostCheckbox(hostId: string, os: string) {
    await this.page.getByTestId(`checkboxSelectRow-${hostId}-${os}`).click();
  }

  public async clickSelectedHostsButton() {
    await this.selectedHostsFilterButton.click();
  }

  public async clickAddFilterButton() {
    await this.addFilterButton.click();
  }

  // KPI helpers

  public async getKPITileValue(type: string) {
    const element = this.kpiGrid.getByTestId(`hostsViewKPI-${type}`);
    const valueDiv = element.locator('.echMetricText__value');
    return valueDiv.getAttribute('title');
  }

  // Metrics tab

  public async visitMetricsTab() {
    await this.metricsTab.scrollIntoViewIfNeeded();
    await this.metricsTab.click();
  }

  public getMetricsCharts() {
    return this.metricsChartsContainer.locator(
      '[data-test-subj*="hostsView-metricChart-"]:not([data-test-subj*="hover-actions"])'
    );
  }

  public async clickMetricChartAction(chartTestId: string) {
    const element = this.page.getByTestId(chartTestId);
    await element.hover();
    const button = element.getByTestId('embeddablePanelToggleMenuIcon');
    await button.click();
    const menu = this.page.getByTestId('presentationPanelContextMenuItems');
    await menu.hover();
  }

  // Logs tab

  public async visitLogsTab() {
    await this.logsTab.scrollIntoViewIfNeeded();
    await this.logsTab.click();
  }

  // Alerts tab

  public async visitAlertsTab() {
    await this.alertsTab.scrollIntoViewIfNeeded();
    await this.alertsTab.click();
  }

  public async getAlertsCount() {
    return this.alertsTabCountBadge.innerText();
  }

  public async setAlertStatusFilter(status?: 'active' | 'recovered' | 'untracked' | 'all') {
    const buttonMap: Record<string, string> = {
      active: 'hostsView-alert-status-filter-active-button',
      recovered: 'hostsView-alert-status-filter-recovered-button',
      untracked: 'hostsView-alert-status-filter-untracked-button',
      all: 'hostsView-alert-status-filter-show-all-button',
    };
    const testId = status ? buttonMap[status] : buttonMap.all;
    await this.page.getByTestId(testId).click();
  }

  // Pagination

  public async changePageSize(pageSize: number) {
    await this.pageSizeSelector.click();
    await this.page.getByTestId(`tablePagination-${pageSize}-rows`).click();
  }

  public async paginateTo(pageNumber: number) {
    await this.page.getByTestId(`pagination-button-${pageNumber - 1}`).click();
  }

  // Sorting

  public async sortByCpuUsage() {
    const cpuHeader = this.page.getByTestId('tableHeaderCell_cpuV2_2');
    await cpuHeader.getByTestId('tableHeaderSortButton').click();
  }

  public async sortByTitle() {
    const titleHeader = this.page.getByTestId('tableHeaderCell_title_1');
    await titleHeader.getByTestId('tableHeaderSortButton').click();
  }

  // Filter controls

  public async openFilterControl(fieldName: string) {
    const controlTestId = `optionsList-control-${fieldName}`;
    const control = this.page.getByTestId(controlTestId);
    await control.locator('.euiLoadingSpinner').waitFor({ state: 'hidden' });
    await control.waitFor();
    await control.click();
    await this.excludeButton.waitFor();
  }

  public async enableExcludeMode() {
    await this.excludeButton.waitFor();
    await this.excludeButton.click();
  }

  public async selectFilterOption(optionValue: string) {
    const optionTestId = `optionsList-control-selection-${optionValue}`;
    const option = this.page.getByTestId(optionTestId);
    await option.waitFor();
    await option.click();
    await this.waitForTableToLoad();
  }
}
