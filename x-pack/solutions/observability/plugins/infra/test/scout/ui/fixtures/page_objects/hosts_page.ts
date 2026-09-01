/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT, KPI_METRICS } from '../constants';

type PreferredSchema = 'ecs' | 'semconv' | null;

const buildHostsQuery = (hostNames: string[] = []) =>
  hostNames.map((hostName) => `host.name : ${JSON.stringify(hostName)}`).join(' or ');

const buildHostsRisonState = ({
  from,
  to,
  hostNames,
  preferredSchema,
}: {
  from: string;
  to: string;
  hostNames?: string[];
  preferredSchema: PreferredSchema;
}) =>
  rison.encodeUnknown({
    dateRange: { from, to },
    filters: [],
    limit: 100,
    panelFilters: [],
    preferredSchema,
    query: { language: 'kuery', query: buildHostsQuery(hostNames) },
  });

export class HostsPage {
  public readonly tableLoaded: Locator;
  public readonly tableRows: Locator;
  public readonly tableNoData: Locator;
  public readonly searchBar: Locator;
  public readonly querySubmitButton: Locator;
  public readonly errorCallout: Locator;

  public readonly logsTab: Locator;
  public readonly alertsTab: Locator;

  public readonly kpiGrid: Locator;

  public readonly selectedHostsFilterButton: Locator;
  public readonly addFilterButton: Locator;
  public readonly excludeButton: Locator;
  public readonly availableFilterOptions: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.tableLoaded = this.page.getByTestId('hostsView-table-loaded');
    this.tableRows = this.page.getByTestId('hostsView-tableRow');
    // EuiBasicTable renders noItemsMessage in both caption (a11y) and body cell; scope to cell.
    this.tableNoData = this.page.getByRole('cell').getByTestId('hostsViewTableNoData');
    this.searchBar = this.page.getByTestId('queryInput');
    this.querySubmitButton = this.page.getByTestId('querySubmitButton');
    this.errorCallout = this.page.getByTestId('hostsViewErrorCallout');

    this.logsTab = this.page.getByTestId('hostsView-tabs-logs');
    this.alertsTab = this.page.getByTestId('hostsView-tabs-alerts');

    this.kpiGrid = this.page.getByTestId('hostsViewKPIGrid');

    this.selectedHostsFilterButton = this.page.getByTestId('hostsViewTableSelectHostsFilterButton');
    this.addFilterButton = this.page.getByTestId('hostsViewTableAddFilterButton');
    this.excludeButton = this.page.getByTestId('optionsList__excludeResults');
    this.availableFilterOptions = this.page.getByTestId('optionsList-control-available-options');
  }

  private async waitForTableToLoad() {
    await this.tableLoaded.waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  /**
   * Submits a KQL query. If the search bar already has a value (for example the
   * host filter from `goToPage({ hostNames })`), the new query is AND-combined
   * with the current value so that filter is preserved.
   */
  public async submitQuery(query: string) {
    const currentQuery = await this.searchBar.inputValue();
    const combinedQuery = currentQuery ? `(${currentQuery}) and (${query})` : query;
    await this.searchBar.clear();
    await this.searchBar.fill(combinedQuery);
    await this.querySubmitButton.click();
    await Promise.race([
      this.tableLoaded.waitFor({ timeout: EXTENDED_TIMEOUT }),
      this.errorCallout.waitFor({ timeout: EXTENDED_TIMEOUT }),
      this.tableNoData.waitFor({ timeout: EXTENDED_TIMEOUT }),
    ]);
  }

  public async goToPage({
    from,
    to,
    hostNames,
    preferredSchema = null,
    skipLoadWait = false,
  }: {
    from: string;
    to: string;
    hostNames?: string[];
    preferredSchema?: PreferredSchema;
    skipLoadWait?: boolean;
  }) {
    const baseUrl = this.kbnUrl.app('metrics');
    const risonState = buildHostsRisonState({
      from,
      to,
      hostNames,
      preferredSchema,
    });
    await this.page.goto(`${baseUrl}/hosts?_a=${risonState}`, { timeout: EXTENDED_TIMEOUT });
    if (!skipLoadWait) {
      await this.waitForTableToLoad();
    }
  }

  public async goToPageWithRelativeRange({
    rangeFrom,
    rangeTo,
    hostNames,
    preferredSchema = null,
    skipLoadWait = false,
  }: {
    rangeFrom: string;
    rangeTo: string;
    hostNames?: string[];
    preferredSchema?: PreferredSchema;
    skipLoadWait?: boolean;
  }) {
    const baseUrl = this.kbnUrl.app('metrics');
    const risonState = buildHostsRisonState({
      from: rangeFrom,
      to: rangeTo,
      hostNames,
      preferredSchema,
    });
    await this.page.goto(`${baseUrl}/hosts?_a=${risonState}`, { timeout: EXTENDED_TIMEOUT });
    if (!skipLoadWait) {
      await this.waitForTableToLoad();
    }
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

  public async clickHostCheckbox(hostId: string, os: string) {
    await this.page.getByTestId(`checkboxSelectRow-${hostId}-${os}`).click();
  }

  public async clickSelectedHostsButton() {
    await this.selectedHostsFilterButton.click();
  }

  public async clickAddFilterButton() {
    await this.addFilterButton.click();
  }

  public async openFilterControl(fieldName: string) {
    const control = this.page.getByTestId(`optionsList-control-${fieldName}`);
    await control.waitFor({ timeout: EXTENDED_TIMEOUT });
    await control.click();
    await this.availableFilterOptions.waitFor({
      state: 'visible',
      timeout: EXTENDED_TIMEOUT,
    });
  }

  public async closeFilterControl() {
    await this.page.keyboard.press('Escape');
    await this.availableFilterOptions.waitFor({
      state: 'hidden',
      timeout: EXTENDED_TIMEOUT,
    });
  }

  public async enableExcludeMode() {
    await this.excludeButton.click();
    await this.excludeButton
      .and(this.page.locator('[aria-pressed="true"]'))
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  public async selectFilterOption(optionValue: string) {
    const option = this.page.getByTestId(`optionsList-control-selection-${optionValue}`);
    await option.waitFor({ timeout: EXTENDED_TIMEOUT });
    await option.click({ timeout: EXTENDED_TIMEOUT });
    await this.waitForTableToLoad();
  }

  private getHostKPIValueSelector(kpiPanelTestId: string): string {
    // Relative to `kpiGrid` — do not repeat `hostsViewKPIGrid` here or Playwright
    // will nest the selector twice (grid + grid + KPI).
    return `[data-test-subj="${kpiPanelTestId}"] .echMetricText__value`;
  }

  private async waitForHostKPIValueTitleToBeSet(metric: string, timeout?: number) {
    await this.getHostKPIChartValueLocator(metric).waitFor({ state: 'attached', timeout });
    const kpiPanelTestId = `hostsViewKPI-${metric}`;
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

  /**
   * Value locator for the host KPI tiles (`cpuUsage`, `normalizedLoad1m`,
   * `memoryUsage`, `diskUsage`) rendered on the hosts page grid via the
   * `MetricChartWrapper` (`hostsViewKPI-*` test subjects).
   */
  public getHostKPIChartValueLocator(metric: string) {
    return this.kpiGrid.getByTestId(`hostsViewKPI-${metric}`).locator('.echMetricText__value');
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
   * Waits for the KPI grid to settle on its first render: the CPU tile swaps its
   * loading placeholder for the rendered `Metric` value element. Useful in
   * `beforeEach` blocks that just need the page-ready signal before assertions
   * begin, without waiting on every individual chart value.
   */
  public async waitForKPILoadingToFinish(timeout?: number) {
    await this.kpiGrid
      .getByTestId('hostsViewKPI-cpuUsage')
      .locator('.echMetricText__value')
      .waitFor({ state: 'attached', timeout });
  }

  public async visitLogsTab() {
    await this.logsTab.scrollIntoViewIfNeeded();
    await this.logsTab.click();
  }

  public async visitAlertsTab() {
    await this.alertsTab.scrollIntoViewIfNeeded();
    await this.alertsTab.click();
    await this.page
      .getByTestId('hostsView-alerts')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  public getAlertsTable(): Locator {
    return this.page.getByTestId('alertsTableIsLoaded');
  }

  public async waitForAlertsTableToLoad(): Promise<void> {
    await this.getAlertsTable().waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
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
