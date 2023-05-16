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
    async clickTryHostViewLink() {
      return await testSubjects.click('inventory-hostsView-link');
    },

    async clickTryHostViewBadge() {
      return await testSubjects.click('inventory-hostsView-link-badge');
    },

    async clickTableOpenFlyoutButton() {
      return testSubjects.click('hostsView-flyout-button');
    },

    async clickCloseFlyoutButton() {
      return testSubjects.click('euiFlyoutCloseButton');
    },

    async clickProcessesFlyoutTab() {
      return testSubjects.click('hostsView-flyout-tabs-processes');
    },

    async clickProcessesTableExpandButton() {
      return testSubjects.click('infraProcessRowButton');
    },

    async clickFlyoutUptimeLink() {
      return testSubjects.click('hostsView-flyout-uptime-link');
    },

    async clickFlyoutApmServicesLink() {
      return testSubjects.click('hostsView-flyout-apm-services-link');
    },

    async clickAddMetadataFilter() {
      return testSubjects.click('hostsView-flyout-metadata-add-filter');
    },

    async clickRemoveMetadataFilter() {
      return testSubjects.click('hostsView-flyout-metadata-remove-filter');
    },

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
      const container = await testSubjects.find('hostsView-enable-feature-button');
      return container;
    },

    async clickEnableHostViewButton() {
      return await testSubjects.click('hostsView-enable-feature-button');
    },

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
      const [title, os, cpuUsage, diskLatency, rx, tx, memoryTotal, memory] = await Promise.all(
        cells.map((cell) => this.getHostsCellContent(cell))
      );

      return { title, os, cpuUsage, diskLatency, rx, tx, memoryTotal, memory };
    },

    async getHostsCellContent(cell: WebElementWrapper) {
      const cellContent = await cell.findByClassName('euiTableCellContent');
      return cellContent.getVisibleText();
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
      const element = await testSubjects.find('hostsView-metricChart-diskIOWrite');
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

    // Flyout Tabs
    getMetadataTab() {
      return testSubjects.find('hostsView-flyout-tabs-metadata');
    },

    async getMetadataTabName() {
      const tabElement = await this.getMetadataTab();
      const tabTitle = await tabElement.findByClassName('euiTab__content');
      return tabTitle.getVisibleText();
    },

    async getAppliedFilter() {
      const filter = await testSubjects.find(
        "filter-badge-'host.architecture: arm64' filter filter-enabled filter-key-host.architecture filter-value-arm64 filter-unpinned filter-id-0"
      );
      return filter.getVisibleText();
    },

    async getRemoveFilterExist() {
      return testSubjects.exists('hostsView-flyout-metadata-remove-filter');
    },

    async getProcessesTabContentTitle(index: number) {
      const processesListElements = await testSubjects.findAll('infraProcessesSummaryTableItem');
      return processesListElements[index].findByCssSelector('dt');
    },

    async getProcessesTabContentTotalValue() {
      const processesListElements = await testSubjects.findAll('infraProcessesSummaryTableItem');
      return processesListElements[0].findByCssSelector('dd');
    },

    getProcessesTable() {
      return testSubjects.find('infraProcessesTable');
    },

    async getProcessesTableBody() {
      const processesTable = await this.getProcessesTable();
      return processesTable.findByCssSelector('tbody');
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
    getDiskLatencyHeader() {
      return testSubjects.find('tableHeaderCell_diskLatency_4');
    },

    getTitleHeader() {
      return testSubjects.find('tableHeaderCell_title_1');
    },

    async sortByDiskLatency() {
      const diskLatency = await this.getDiskLatencyHeader();
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
