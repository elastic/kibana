/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertStatus, ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraHostsViewProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async clickTableOpenFlyoutButton() {
      return testSubjects.click('hostsView-flyout-button');
    },

    async clickHostCheckbox(id: string, os: string) {
      return testSubjects.click(`checkboxSelectRow-${id}-${os}`);
    },

    async clickSelectedHostsButton() {
      return testSubjects.click('hostsViewTableSelectHostsFilterButton');
    },

    async clickSelectedHostsAddFilterButton() {
      return testSubjects.click('hostsViewTableAddFilterButton');
    },

    async clickCloseFlyoutButton() {
      return testSubjects.click('euiFlyoutCloseButton');
    },

    async getBetaBadgeExists() {
      return testSubjects.exists('infra-beta-badge');
    },

    // Inventory UI
    async clickTryHostViewLink() {
      return await testSubjects.click('inventory-hostsView-link');
    },

    async clickTryHostViewBadge() {
      return await testSubjects.click('inventory-hostsView-link-badge');
    },

    // Splash screen

    async getHostsLandingPageDisabled() {
      const container = await testSubjects.find('hostView-no-enable-access');
      const containerText = await container.getVisibleText();
      return containerText;
    },

    async getHostsLandingPageDocsLink() {
      const container = await testSubjects.find('hostsView-docs-link');
      const containerText = await container.getAttribute('href');
      return containerText;
    },

    async getHostsLandingPageEnableButton() {
      return testSubjects.find('hostsView-enable-feature-button');
    },

    async clickEnableHostViewButton() {
      return testSubjects.click('hostsView-enable-feature-button');
    },

    // Table

    async getHostsTable() {
      return testSubjects.find('hostsView-table');
    },

    async isHostTableLoading() {
      return !(await testSubjects.exists('tbody[class*=euiBasicTableBodyLoading]'));
    },

    async getHostsTableData() {
      const table = await this.getHostsTable();
      return table.findAllByTestSubject('hostsView-tableRow');
    },

    async getHostsRowData(row: WebElementWrapper) {
      // Find all the row cells
      const cells = await row.findAllByCssSelector('[data-test-subj*="hostsView-tableRow-"]');

      // Retrieve content for each cell
      const [title, cpuUsage, normalizedLoad, memoryUsage, memoryFree, diskSpaceUsage, rx, tx] =
        await Promise.all(cells.map((cell) => this.getHostsCellContent(cell)));

      return { title, cpuUsage, normalizedLoad, memoryUsage, memoryFree, diskSpaceUsage, rx, tx };
    },

    async getHostsCellContent(cell: WebElementWrapper) {
      const cellContent = await cell.findByClassName('euiTableCellContent');
      return cellContent.getVisibleText();
    },

    async selectedHostsButtonExist() {
      return testSubjects.exists('hostsViewTableSelectHostsFilterButton');
    },

    async getMetricsTrendContainer() {
      return testSubjects.find('hostsViewKPIGrid');
    },

    async getChartsContainer() {
      return testSubjects.find('hostsView-metricChart');
    },

    // Metrics Tab
    async getMetricsTab() {
      return testSubjects.find('hostsView-tabs-metrics');
    },

    async visitMetricsTab() {
      const metricsTab = await this.getMetricsTab();
      return metricsTab.click();
    },

    async getAllMetricsCharts() {
      const container = await this.getChartsContainer();
      return container.findAllByCssSelector('[data-test-subj*="hostsView-metricChart-"]');
    },

    async clickAndValidateMetriChartActionOptions() {
      const element = await testSubjects.find('hostsView-metricChart-tx');
      await element.moveMouseTo();
      const button = await element.findByTestSubject('embeddablePanelToggleMenuIcon');
      await button.click();
      await testSubjects.existOrFail('embeddablePanelAction-openInLens');
      // forces the modal to close
      await element.click();
    },

    // KPIs
    async isKPIChartsLoaded() {
      return !(await testSubjects.exists(
        '[data-test-subj=hostsView-metricsTrend] .echChartStatus[data-ech-render-complete=true]'
      ));
    },

    async getAllKPITiles() {
      const container = await this.getMetricsTrendContainer();
      return container.findAllByCssSelector('[data-test-subj*="hostsViewKPI-"]');
    },

    async getKPITileValue(type: string) {
      const container = await this.getMetricsTrendContainer();
      const element = await container.findByTestSubject(`hostsViewKPI-${type}`);
      const div = await element.findByClassName('echMetricText__value');
      return div.getAttribute('title');
    },

    // Logs Tab
    getLogsTab() {
      return testSubjects.find('hostsView-tabs-logs');
    },

    async visitLogsTab() {
      const logsTab = await this.getLogsTab();
      await logsTab.click();
    },

    async getLogEntries() {
      const container = await testSubjects.find('hostsView-logs');

      return container.findAllByCssSelector('[data-test-subj*=streamEntry]');
    },

    async getLogsTableColumnHeaders() {
      const columnHeaderElements: WebElementWrapper[] = await testSubjects.findAll(
        '~logColumnHeader'
      );
      return await Promise.all(columnHeaderElements.map((element) => element.getVisibleText()));
    },

    // Alerts Tab
    getAlertsTab() {
      return testSubjects.find('hostsView-tabs-alerts');
    },

    getAlertsTabCountBadge() {
      return testSubjects.find('hostsView-tabs-alerts-count');
    },

    async getAlertsCount() {
      const alertsCountBadge = await this.getAlertsTabCountBadge();
      return alertsCountBadge.getVisibleText();
    },

    async visitAlertTab() {
      const alertsTab = await this.getAlertsTab();
      await alertsTab.click();
    },

    setAlertStatusFilter(alertStatus?: AlertStatus) {
      const buttons = {
        [ALERT_STATUS_ACTIVE]: 'hostsView-alert-status-filter-active-button',
        [ALERT_STATUS_RECOVERED]: 'hostsView-alert-status-filter-recovered-button',
        all: 'hostsView-alert-status-filter-show-all-button',
      };

      const buttonSubject = alertStatus ? buttons[alertStatus] : buttons.all;

      return testSubjects.click(buttonSubject);
    },

    // Query Bar
    getQueryBar() {
      return testSubjects.find('queryInput');
    },

    async typeInQueryBar(query: string) {
      const queryBar = await this.getQueryBar();
      await queryBar.clearValueWithKeyboard();
      return queryBar.type(query);
    },

    async submitQuery(query: string) {
      await this.typeInQueryBar(query);
      await testSubjects.click('querySubmitButton');
    },

    // Pagination
    getPageNumberButton(pageNumber: number) {
      return testSubjects.find(`pagination-button-${pageNumber - 1}`);
    },

    getPageSizeSelector() {
      return testSubjects.find('tablePaginationPopoverButton');
    },

    getPageSizeOption(pageSize: number) {
      return testSubjects.find(`tablePagination-${pageSize}-rows`);
    },

    async changePageSize(pageSize: number) {
      const pageSizeSelector = await this.getPageSizeSelector();
      await pageSizeSelector.click();
      const pageSizeOption = await this.getPageSizeOption(pageSize);
      await pageSizeOption.click();
    },

    async paginateTo(pageNumber: number) {
      const paginationButton = await this.getPageNumberButton(pageNumber);
      await paginationButton.click();
    },

    // Sorting
    getCpuUsageHeader() {
      return testSubjects.find('tableHeaderCell_cpu_2');
    },

    getTitleHeader() {
      return testSubjects.find('tableHeaderCell_title_1');
    },

    async sortByCpuUsage() {
      const diskLatency = await this.getCpuUsageHeader();
      const button = await testSubjects.findDescendant('tableHeaderSortButton', diskLatency);
      await button.click();
    },

    async sortByTitle() {
      const titleHeader = await this.getTitleHeader();
      const button = await testSubjects.findDescendant('tableHeaderSortButton', titleHeader);
      await button.click();
    },
  };
}
