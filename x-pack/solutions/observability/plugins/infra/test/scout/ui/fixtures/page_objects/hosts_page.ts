/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT, KPI_METRICS } from '../constants';

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

  public readonly tablePageSizeSelector: Locator;
  public readonly selectedHostsFilterButton: Locator;
  public readonly addFilterButton: Locator;
  public readonly noDataPage: Locator;
  public readonly noDataPageActionButton: Locator;

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

    this.tablePageSizeSelector = this.page.getByTestId('tablePaginationPopoverButton');
    this.selectedHostsFilterButton = this.page.getByTestId('hostsViewTableSelectHostsFilterButton');
    this.addFilterButton = this.page.getByTestId('hostsViewTableAddFilterButton');
    this.noDataPage = this.page.getByTestId('kbnNoDataPage');
    this.noDataPageActionButton = this.noDataPage.getByTestId('noDataDefaultActionButton');
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
    skipLoadWait = false,
  }: {
    from: string;
    to: string;
    preferredSchema?: PreferredSchema;
    skipLoadWait?: boolean;
  }) {
    const baseUrl = this.kbnUrl.app('metrics');
    const schemaPart =
      preferredSchema === null ? 'preferredSchema:!n' : `preferredSchema:${preferredSchema}`;
    const risonState = `(dateRange:(from:'${from}',to:'${to}'),filters:!(),limit:100,panelFilters:!(),${schemaPart},query:(language:kuery,query:''))`;
    await this.page.goto(`${baseUrl}/hosts?_a=${risonState}`);
    if (!skipLoadWait) {
      await this.waitForTableToLoad();
    }
  }

  public async goToPageWithRelativeRange({
    rangeFrom,
    rangeTo,
    preferredSchema = null,
    skipLoadWait = false,
  }: {
    rangeFrom: string;
    rangeTo: string;
    preferredSchema?: PreferredSchema;
    skipLoadWait?: boolean;
  }) {
    const baseUrl = this.kbnUrl.app('metrics');
    const schemaPart =
      preferredSchema === null ? 'preferredSchema:!n' : `preferredSchema:${preferredSchema}`;
    const risonState = `(dateRange:(from:'${rangeFrom}',to:'${rangeTo}'),filters:!(),limit:100,panelFilters:!(),${schemaPart},query:(language:kuery,query:''))`;
    await this.page.goto(`${baseUrl}/hosts?_a=${risonState}`);
    if (!skipLoadWait) {
      await this.waitForTableToLoad();
    }
  }

  public async goToHostsPage(opts: { skipLoadWait?: boolean } = {}) {
    const baseUrl = this.kbnUrl.app('metrics');
    await this.page.goto(`${baseUrl}/hosts`);
    if (!opts.skipLoadWait) {
      await this.waitForTableToLoad();
    }
  }

  public async clickNoDataPageAddDataButton() {
    await this.noDataPageActionButton.click();
  }

  public getHostRow(hostName: string) {
    return this.tableRows.filter({
      has: this.page
        .getByTestId('hostsViewTableEntryTitleLink')
        .getByText(hostName, { exact: true }),
    });
  }

  public async openHostFlyout(hostName: string) {
    const row = this.getHostRow(hostName);
    await row.getByTestId('hostsView-flyout-button').click();
    await this.page.getByTestId('infraAssetDetailsFlyout').waitFor({ timeout: EXTENDED_TIMEOUT });
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

  public getCellContentLocator(row: Locator, cellTestId: string): Locator {
    return row.getByTestId(cellTestId).locator('.euiTableCellContent');
  }

  public getRowDataLocators(row: Locator) {
    return {
      alertsCount: this.getCellContentLocator(row, 'hostsView-tableRow-alertsCount'),
      title: row.getByTestId('hostsViewTableEntryTitleLink'),
      cpuUsage: this.getCellContentLocator(row, 'hostsView-tableRow-cpuUsage'),
      normalizedLoad: this.getCellContentLocator(row, 'hostsView-tableRow-normalizedLoad1m'),
      memoryUsage: this.getCellContentLocator(row, 'hostsView-tableRow-memoryUsage'),
      memoryFree: this.getCellContentLocator(row, 'hostsView-tableRow-memoryFree'),
      diskSpaceUsage: this.getCellContentLocator(row, 'hostsView-tableRow-diskSpaceUsage'),
      rx: this.getCellContentLocator(row, 'hostsView-tableRow-rx'),
      tx: this.getCellContentLocator(row, 'hostsView-tableRow-tx'),
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

  private getHostKPIValueSelector(kpiPanelTestId: string): string {
    // Relative to `kpiGrid` — do not repeat `hostsViewKPIGrid` here or Playwright
    // will nest the selector twice (grid + grid + KPI).
    return `[data-test-subj="${kpiPanelTestId}"] .echMetricText__value`;
  }

  private async waitForHostKPIValueTitleToBeSet(metric: string, timeout?: number) {
    await this.getHostKPIChartValueLocator(metric).waitFor({ state: 'attached', timeout });
    const kpiPanelTestId = `infraAssetDetailsKPI${metric}`;
    const selector = `[data-test-subj="hostsViewKPIGrid"] ${this.getHostKPIValueSelector(
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

  public getKPITileValueLocator(type: string) {
    return this.kpiGrid.getByTestId(`hostsViewKPI-${type}`).locator('.echMetricText__value');
  }

  /**
   * Value locator for the shared host KPI tiles (`cpuUsage`, `normalizedLoad1m`,
   * `memoryUsage`, `diskUsage`) rendered via `HostKpiCharts`. They use the
   * `infraAssetDetailsKPI*` prefix in both the hosts page grid and the flyout;
   * scoping to the hosts page `kpiGrid` disambiguates when both are on screen.
   */
  public getHostKPIChartValueLocator(metric: string) {
    return this.kpiGrid
      .getByTestId(`infraAssetDetailsKPI${metric}`)
      .locator('.echMetricText__value');
  }

  /**
   * Lens embeddable error panel shown when a KPI fails to render.
   * `data-test-subj="embeddableError"` is defined by the shared embeddable panel error component.
   */
  public getHostKPIEmbeddableError(metric: string) {
    return this.kpiGrid.getByTestId(`infraAssetDetailsKPI${metric}`).getByTestId('embeddableError');
  }

  /**
   * Waits for the shared host KPI tiles to finish rendering. Uses parallel
   * `waitFor` calls so the budget is shared across charts instead of compounding
   * when one takes longer to render than the others (a common CI flake source).
   */
  public async waitForHostKPIChartsToLoad(metrics: readonly string[], timeout?: number) {
    await this.waitForKPILoadingToFinish(timeout);
    for (const metric of metrics) {
      await this.waitForHostKPIValueTitleToBeSet(metric, timeout);
    }
  }

  /**
   * Waits for the KPI loading spinner to disappear. Complements
   * `waitForHostKPIChartsToLoad` (which waits for the value element to appear)
   * and is useful in `beforeEach` blocks that just need the page-ready signal
   * before assertions begin, without waiting on every individual chart value.
   */
  public async waitForKPILoadingToFinish(timeout?: number) {
    await this.kpiGrid
      .getByTestId('infraAssetDetailsKPIcpuUsage')
      .getByRole('progressbar', { name: 'Loading' })
      .waitFor({ state: 'hidden', timeout });
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

  // Pagination

  public async changePageSize(pageSize: number) {
    await this.tablePageSizeSelector.click();
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

  public async clickRefresh() {
    await this.querySubmitButton.click();
    await this.waitForTableToLoad();
  }

  public async getKPIValuesSnapshot(timeout?: number): Promise<Record<string, string | null>> {
    await this.waitForKPILoadingToFinish(timeout);
    const snapshot: Record<string, string | null> = {};
    for (const metric of KPI_METRICS) {
      const locator = this.getHostKPIChartValueLocator(metric);
      const count = await locator.count();
      snapshot[metric] = count > 0 ? await locator.getAttribute('title') : null;
    }
    return snapshot;
  }
}
