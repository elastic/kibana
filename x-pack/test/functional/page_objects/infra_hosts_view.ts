/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertStatus } from '@kbn/rule-data-utils';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
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

    async getBetaBadgeExists() {
      return testSubjects.exists('infra-beta-badge');
    },

    // Inventory UI
    async clickTryHostViewLink() {
      return testSubjects.click('inventory-hostsView-link');
    },

    async clickTryHostViewBadge() {
      return testSubjects.click('inventory-hostsView-link-badge');
    },

    // Table

    async getHostsTable() {
      return testSubjects.find('hostsView-table-loaded');
    },

    async isHostTableLoaded() {
      return !(await testSubjects.exists('hostsView-table-loading'));
    },

    async getHostsTableData() {
      const table = await this.getHostsTable();
      return table.findAllByTestSubject('hostsView-tableRow');
    },

    async getHostsRowData(row: WebElementWrapper) {
      // Find all the row cells
      const cells = await row.findAllByCssSelector('[data-test-subj*="hostsView-tableRow-"]');

      // Retrieve content for each cell
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
      ] = await Promise.all(cells.map((cell) => this.getHostsCellContent(cell)));

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

    async getAllHostDetailLinks() {
      return testSubjects.findAll('hostsViewTableEntryTitleLink');
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

    async clickAndValidateMetricChartActionOptions() {
      const element = await testSubjects.find('hostsView-metricChart-tx');
      await element.moveMouseTo();
      const button = await element.findByTestSubject('embeddablePanelToggleMenuIcon');
      await button.click();
      await testSubjects.existOrFail('embeddablePanelAction-openInLens');
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
      const buttons: Record<AlertStatus | 'all', string> = {
        active: 'hostsView-alert-status-filter-active-button',
        recovered: 'hostsView-alert-status-filter-recovered-button',
        untracked: 'hostsView-alert-status-filter-untracked-button',
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
    getMemoryHeader() {
      return testSubjects.find('tableHeaderCell_memory_5');
    },

    getTitleHeader() {
      return testSubjects.find('tableHeaderCell_title_2');
    },

    async sortByMemoryUsage() {
      const memory = await this.getMemoryHeader();
      const button = await testSubjects.findDescendant('tableHeaderSortButton', memory);
      await button.click();
    },

    async sortByTitle() {
      const titleHeader = await this.getTitleHeader();
      const button = await testSubjects.findDescendant('tableHeaderSortButton', titleHeader);
      await button.click();
    },
  };
}
